const Steller = require('../src/steller.js');
const assert = require('chai').assert;
require('../src/steller.lib.js');

function makeGame (onlyObject=false) {
    let gameObject = {
        locations: {
            location1: {
                initial: true,
                name: 'Initial location',
                exits: {
                    exit1: '',
                    exit2: ''
                },
                actions: {
                    action1: ''
                }
            }
        },
        objects: {
            object1: {
                name: 'Object 1',
                location: 'location1',
                properties: {
                    movable: {
                        objectName: 'the object',
                    },
                    usableWith: {
                        usingText: 'using object 1, yeah!'
                    },
                    talkable: {
                        topics: {
                            'Weather': {
                                text: 'Wow, il rains!'
                            }
                        }
                    }
                }
            },
            object2: {
                name: 'Object 2',
                location: 'location1',
                properties: {
                    movable: {
                        dropCommand: 'drop it!',
                        takeCommand: 'take it!',
                        dropText: 'yeah, dropped!',
                        takeText: 'yeah, taken!'
                    },
                    usableWith: {
                        title: 'Object 2 Use With',
                        command: 'you try to use Object 2',
                        interactions: {
                            object3: {
                                command: 'use with object 3',
                                text: 'used with object 3'
                            },
                            default: 'Default action'
                        }
                    }
                }
            },
            object3: {
                name: 'Object 3',
                location: 'location1',
                properties: {
                    movable: {},
                    usableWith: {
                        objectName: 'object 3',
                        interactions: {
                            object1: {
                                text: 'used with object 1'
                            },
                            object2: {
                                command: 'use with object 2'
                            },
                        }
                    }
                }
            }
        }
    };

    if (onlyObject) return gameObject;

    let game =  new Steller.Game(gameObject);
    return game;
}

describe('Steller standard library', function() {
    it('should handle movable objects', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.inventory, {objects: []});
        assert.equal(game.state.main.objects[0].actions[0].name, 'Take');
        game.state.main.objects[0].actions[0].text();
        game.state.main.objects[0].actions[0].text();
        game.state.main.objects[0].actions[0].text();
        assert.equal(game.state.inventory.objects.length, 3);
        assert.equal(game.state.inventory.objects[0].name, 'Object 1');
        assert.equal(game.state.inventory.objects[0].actions[0].name, 'Drop');
        game.state.inventory.objects[0].actions[0].text();
        game.state.inventory.objects[0].actions[0].text();
        game.state.inventory.objects[0].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'take the object', type: 'command' },
                { text: 'Taken', type: 'normal' },
                { text: 'take it!', type: 'command' },
                { text: 'yeah, taken!', type: 'normal' },
                { text: 'take', type: 'command' },
                { text: 'Taken', type: 'normal' },
                { text: 'drop the object', type: 'command' },
                { text: 'Dropped', type: 'normal' },
                { text: 'drop it!', type: 'command' },
                { text: 'yeah, dropped!', type: 'normal' },
                { text: 'drop', type: 'command' },
                { text: 'Dropped', type: 'normal' }
            ]
        });
    });

    it('should handle usablewith objects', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.state.main.objects[0].actions.length, 2);

        // take object 1
        game.state.main.objects[0].actions[0].text()

        assert.equal(game.state.inventory.objects[0].actions.length, 3);
        assert.equal(game.state.inventory.objects[0].actions[1].name, 'Use with');

        assert.deepEqual(game.state.action, {});
        assert.isFalse(game.state.locked);
        assert.equal(game.state.main.actions.length, 1);
        assert.equal(game.state.main.exits.length, 2);
        assert.equal(game.state.main.objects[0].actions.length, 1);
        assert.equal(game.state.inventory.objects[0].actions.length, 3);

        // use "use with" of object 1 from inventory
        game.state.inventory.objects[0].actions[1].text();

        assert.equal(game.state.action.title, 'Use with');
        assert.equal(game.state.action.actions.length, 2);
        assert.equal(game.state.action.actions[0].name, 'Object 2');
        assert.equal(game.state.action.actions[1].name, 'Object 3');
        assert.isTrue(game.state.locked);
        assert.equal(game.state.main.actions.length, 0);
        assert.equal(game.state.main.exits.length, 0);
        assert.equal(game.state.main.objects[0].actions.length, 0);
        assert.equal(game.state.inventory.objects[0].actions.length, 0);

        // use object 1 with object 2
        game.state.action.actions[0].text();
        assert.isFalse(game.state.locked);

        // take object 2
        game.state.main.objects[0].actions[0].text()
        // use object 2
        game.state.inventory.objects[1].actions[1].text();

        assert.equal(game.state.action.title, 'Object 2 Use With');

        // use object 2 with object 1
        game.state.action.actions[0].text();
        // use object 2 with object 3
        game.state.inventory.objects[1].actions[1].text();
        game.state.action.actions[1].text();

        // take object 3
        game.state.main.objects[0].actions[0].text()
        // use object 3 with object 1
        game.state.inventory.objects[2].actions[1].text();
        game.state.action.actions[0].text();
        // use object 3 with object 2
        game.state.inventory.objects[2].actions[1].text();
        game.state.action.actions[1].text();

        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'take the object', type: 'command' },
                { text: 'Taken', type: 'normal' },
                { text: 'use', type: 'command' },
                { text: 'using object 1, yeah!', type: 'normal' },
                { text: 'use Object 1 with Object 2', type: 'command' },
                { text: 'Nothing happens', type: 'normal' },
                { text: 'take it!', type: 'command' },
                { text: 'yeah, taken!', type: 'normal' },
                { text: 'you try to use Object 2', type: 'command' },
                { text: 'using', type: 'normal' },
                { text: 'use with object 3', type: 'command' },
                { text: 'used with object 3', type: 'normal' },
                { text: 'you try to use Object 2', type: 'command' },
                { text: 'using', type: 'normal' },
                { text: 'use Object 2 with Object 1', type: 'command' },
                { text: 'Default action', type: 'normal' },
                { text: 'take', type: 'command' },
                { text: 'Taken', type: 'normal' },
                { text: 'Use with', type: 'command' },
                { text: 'using', type: 'normal' },
                { text: 'use Object 3 with Object 1', type: 'command' },
                { text: 'used with object 1', type: 'normal' },
                { text: 'Use with', type: 'command' },
                { text: 'using', type: 'normal' },
                { text: 'use with object 2', type: 'command' },
                { text: 'Nothing happens', type: 'normal' }
            ]
        });
    });

    it('should handle talkable objects', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.action, {});
        game.state.main.objects[0].actions[1].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'talk', type: 'command' },
                { text: 'talking', type: 'normal' }
            ]
        });
        assert.isTrue(game.state.locked);
        assert.equal(game.state.main.actions.length, 0);
        assert.equal(game.state.main.exits.length, 0);
        assert.equal(game.state.main.objects[0].actions.length, 0);
        assert.equal(game.state.action.title, 'Talk about');
        assert.equal(game.state.action.actions.length, 2);
        assert.equal(game.state.action.actions[0].name, 'Weather');
        assert.equal(game.state.action.actions[1].name, 'Done');

        game.state.action.actions[0].text();

        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'talk', type: 'command' },
                { text: 'talking', type: 'normal' },
                { text: 'talk about Weather', type: 'command' },
                { text: 'Wow, il rains!', type: 'dialogue' }
            ]
        });
        assert.isTrue(game.state.locked);

        game.state.action.actions[1].text();

        assert.isFalse(game.state.locked);
        assert.notEqual(game.state.main.actions.length, 0);
        assert.notEqual(game.state.main.exits.length, 0);
        assert.notEqual(game.state.main.objects[0].actions.length, 0);
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'talk', type: 'command' },
                { text: 'talking', type: 'normal' },
                { text: 'talk about Weather', type: 'command' },
                { text: 'Wow, il rains!', type: 'dialogue' },
                { text: 'end conversation', type: 'command' }
            ]
        });

        game.state.out.texts = [];
        game.objects.object1.properties.talkable.objectName = 'the talking object';
        game.state.main.objects[0].actions[1].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'talk to the talking object', type: 'command' },
                { text: 'talking', type: 'normal' }
            ]
        });
        game.state.action.actions[1].text();

        game.state.out.texts = [];
        game.objects.object1.properties.talkable.topics.Weather.available = false;
        game.state.main.objects[0].actions[1].text();
        assert.equal(game.state.action.actions.length, 1);
        assert.equal(game.state.action.actions[0].name, 'Done');
        game.state.action.actions[0].text();

        game.state.out.texts = [];
        game.objects.object1.properties.talkable.topics.Weather.available = true;
        game.objects.object1.properties.talkable.topics.Weather.command = 'you ask about the weather';
        game.objects.object1.properties.talkable.doneName = 'Done button';
        game.objects.object1.properties.talkable.doneCommand = 'suddenly ed the conversation';
        game.objects.object1.properties.talkable.doneText = 'You are tired of talking. Bye!';
        game.objects.object1.properties.talkable.title = 'Strange, but talking with an object';
        game.objects.object1.properties.talkable.talkingText = '... talking softly ...';
        game.state.main.objects[0].actions[1].text();

        assert.equal(game.state.action.actions[1].name, 'Done button');
        assert.equal(game.state.action.title, 'Strange, but talking with an object');

        game.state.action.actions[0].text();
        game.state.action.actions[1].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'talk to the talking object', type: 'command' },
                { text: '... talking softly ...', type: 'normal' },
                { text: 'you ask about the weather', type: 'command' },
                { text: 'Wow, il rains!', type: 'dialogue' },
                { text: 'suddenly ed the conversation', type: 'command' },
                { text: 'You are tired of talking. Bye!', type: 'normal' }
            ]
        });
    });

    it('should handle changeableState objects', () => {
        const gameObject = makeGame(true);
        gameObject.objects.objects4 = {
            name: 'Object 4',
            location: 'location1',
            properties: {
                changeableState: {
                    text: 'generic text',
                    command: 'generic command',
                    states: [
                        {
                            name: 'State 1',
                            command: 'change state',
                            text: 'changed to state 1'
                        },
                        {
                            name: 'State 2',
                            text: 'changed to state 2'
                        },
                        {
                            name: 'State 3',
                            command: 'change state',
                        }
                    ],
                    beforeStateChange: (newState, oldState) => {
                        game.print('about to change state...');
                    }
                }
            }
        };
        const game = new Steller.Game(gameObject);
        game.run();

        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' }
            ]
        });
        assert.equal(game.state.main.objects[3].actions.length, 1);
        assert.equal(game.state.main.objects[3].actions[0].name, 'State 1');

        game.state.main.objects[3].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'change state', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'changed to state 2', type: 'normal' }
            ]
        });
        assert.equal(game.state.main.objects[3].actions[0].name, 'State 2');

        game.state.main.objects[3].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'change state', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'changed to state 2', type: 'normal' },
                { text: 'generic command', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'generic text', type: 'normal' }
            ]
        });
        assert.equal(game.state.main.objects[3].actions[0].name, 'State 3');

        game.state.main.objects[3].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: '', type: 'normal' },
                { text: 'change state', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'changed to state 2', type: 'normal' },
                { text: 'generic command', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'generic text', type: 'normal' },
                { text: 'change state', type: 'command' },
                { text: 'about to change state...', type: 'normal' },
                { text: 'changed to state 1', type: 'normal' }
            ]
        });
        assert.equal(game.state.main.objects[3].actions[0].name, 'State 1');
    });

});
