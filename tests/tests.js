const Steller = require('../src/steller.js');
const assert = require('chai').assert;

function makeGame (onlyObject=false) {
    let gameObject = {
        initialMessage: 'Here the adventure begins',
        title: 'My adventure',
        score: 0,
        locations: {
            location1: {
                initial: true,
                name: 'Initial location',
                description: 'Wow, such a beautiful location',
                exits: {
                    North: 'location2',
                    South: 'A message, not a location',
                },
                actions: {
                    'Wait': 'I am wating',
                    get Teleport () {
                        game.gotoLocation('location2');
                        return 'Teleported';
                    }
                },
                vars: {
                    var1: 1
                }
            },
            location2: {
                name: 'Second location'
            }
        },
        objects: {
            object1: {
                name: 'Object 1',
                location: 'location1',
                actions: {
                    'Examine': {
                        beforeMessage () {
                            game.print('before message');
                        },
                        afterMessage () {
                            game.print('after message');
                        },
                        command: 'examining',
                        message: 'examined'
                    },
                    'Read': {
                        command: 'reading',
                        message: 'read'
                    }
                },
                vars: {
                    var2: 2
                },
                properties: {
                    movable: {
                        objectName: 'the object',
                        beforeMessage () {
                            game.print('before move');
                        },
                        afterMessage () {
                            game.print('after move');
                        }
                    },
                    usableWith: {
                        usingMessage: 'using object 1, yeah!'
                    },
                    talkable: {
                        topics: {
                            'Weather': {
                                message: 'Wow, il rains!'
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
                        takeCommand: 'take it!'
                    },
                    usableWith: {
                        title: 'Object 2 Use With',
                        command: 'you try to use Object 2',
                        interactions: {
                            object3: {
                                command: 'use with object 3',
                                message: 'used with object 3'
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
                                message: 'used with object 1'
                            },
                            object2: {
                                command: 'use with object 2'
                            },
                        }
                    }
                }
            }
        },
        vars: {
            var3: 3
        }
    };

    if (onlyObject) return gameObject;

    let game =  new Steller.Game(gameObject);
    return game;
}

describe('Steller game', function() {
    it('should throw error on missing initial location', () => {
        const brokenGame = new Steller.Game({
            locations: {
                location1: {}
            }
        });

        assert.throws(() => brokenGame.run(), 'No initial location');
    });

    it('should describe the initial location', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.header, { title: 'My adventure', score: 0 });
        assert.equal(game.state.main.name, 'Initial location');
        assert.equal(game.state.main.description, 'Wow, such a beautiful location');
        assert.equal(game.state.main.exits.length, 2);
        assert.equal(game.state.main.exits[0].name, 'North');
        assert.deepEqual(game.state.out, {messages: [{
            message: 'Here the adventure begins',
            type: 'normal'
        }]});
        assert.equal(game.state.main.actions.length, 2);
        assert.equal(game.state.main.actions[0].name, 'Wait');

    });

    it('should move in the invetory all objects in options.inventory', () => {
        const gameObject = makeGame(true);
        gameObject.objects.object4 = {
            name: 'Object 4'
        };
        gameObject.inventory = [
            'object4'
        ];
        const game = new Steller.Game(gameObject);
        game.run();

        assert.isTrue(game.objectInInventory('object4'));
        assert.equal(_.keys(game.objectsInInventory()).length, 1);
    });

    it('should move between locations', () => {
        const game = makeGame();
        game.run();

        assert.equal(game._currentLocation, 'location1');

        game.state.main.exits[1].message();
        assert.equal(game._currentLocation, 'location1');
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'South', type: 'command' },
                { message: 'A message, not a location', type: 'normal' }
            ]}
        );

        game.state.main.exits[0].message();
        assert.equal(game._currentLocation, 'location2');
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'South', type: 'command' },
                { message: 'A message, not a location', type: 'normal' },
                { message: 'North', type: 'command' }
            ]}
        );
        assert.equal(game.state.main.name, 'Second location');
    });

    it('should execute location actions', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' }
            ]}
        );

        game.state.main.actions[0].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'Wait', type: 'command' },
                { message: 'I am wating', type: 'normal' }
            ]}
        );

        assert.equal(game._currentLocation, 'location1');
        game.state.main.actions[1].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'Wait', type: 'command' },
                { message: 'I am wating', type: 'normal' },
                { message: 'Teleport', type: 'command' },
                { message: 'Teleported', type: 'normal' }
            ]
        });
        assert.equal(game._currentLocation, 'location2');
    });

    it('should execute object actions', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.state.main.objects.length, 3);
        assert.equal(game.state.main.objects[0].name, 'Object 1');
        assert.equal(game.state.main.objects[0].actions.length, 4);
        assert.equal(game.state.main.objects[0].actions[0].name, 'Examine');

        game.state.main.objects[0].actions[0].message();
        assert.deepEqual(game.state.out, {
            messages:[
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'before message', type: 'normal' },
                { message: 'examining', type: 'command' },
                { message: 'examined', type: 'normal' },
                { message: 'after message', type: 'normal' },
            ]
        });

        game.state.main.objects[0].actions[1].message();
    });

    it('should handle score', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.score, 0);
        game.setScore(42)
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 42, type: 'score' }
            ]
        })
        assert.equal(game.score, 42);
    });

    it('should handle takeable objects', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.inventory, {objects: []});
        assert.equal(game.state.main.objects[0].actions[2].name, 'Take');
        game.state.main.objects[0].actions[2].message();
        game.state.main.objects[0].actions[0].message();
        game.state.main.objects[0].actions[0].message();
        assert.equal(game.state.inventory.objects.length, 3);
        assert.equal(game.state.inventory.objects[0].name, 'Object 1');
        assert.equal(game.state.inventory.objects[0].actions[2].name, 'Drop');
        game.state.inventory.objects[0].actions[2].message();
        game.state.inventory.objects[0].actions[0].message();
        game.state.inventory.objects[0].actions[0].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'before move', type: 'normal' },
                { message: 'take the object', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'after move', type: 'normal' },
                { message: 'take it!', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'take', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'before move', type: 'normal' },
                { message: 'drop the object', type: 'command' },
                { message: 'Dropped', type: 'normal' },
                { message: 'after move', type: 'normal' },
                { message: 'drop it!', type: 'command' },
                { message: 'Dropped', type: 'normal' },
                { message: 'drop', type: 'command' },
                { message: 'Dropped', type: 'normal' }
            ]
        });
    });

    it('should handle usablewith objects', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.state.main.objects[0].actions.length, 4);

        // take object 1
        game.state.main.objects[0].actions[2].message()

        assert.equal(game.state.inventory.objects[0].actions.length, 5);
        assert.equal(game.state.inventory.objects[0].actions[3].name, 'Use with');

        assert.deepEqual(game.state.action, {});
        assert.isFalse(game.state.locked);
        assert.equal(game.state.main.actions.length, 2);
        assert.equal(game.state.main.exits.length, 2);
        assert.equal(game.state.main.objects[0].actions.length, 1);
        assert.equal(game.state.inventory.objects[0].actions.length, 5);

        // use "use with" of object 1 from inventory
        game.state.inventory.objects[0].actions[3].message();

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
        game.state.action.actions[0].message();
        assert.isFalse(game.state.locked);

        // take object 2
        game.state.main.objects[0].actions[0].message()
        // use object 2
        game.state.inventory.objects[1].actions[1].message();

        assert.equal(game.state.action.title, 'Object 2 Use With');

        // use object 2 with object 1
        game.state.action.actions[0].message();
        // use object 2 with object 3
        game.state.inventory.objects[1].actions[1].message();
        game.state.action.actions[1].message();

        // take object 3
        game.state.main.objects[0].actions[0].message()
        // use object 3 with object 1
        game.state.inventory.objects[2].actions[1].message();
        game.state.action.actions[0].message();
        // use object 3 with object 2
        game.state.inventory.objects[2].actions[1].message();
        game.state.action.actions[1].message();

        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'before move', type: 'normal' },
                { message: 'take the object', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'after move', type: 'normal' },
                { message: 'use', type: 'command' },
                { message: 'using object 1, yeah!', type: 'normal' },
                { message: 'use Object 1 with Object 2', type: 'command' },
                { message: 'Nothing happens', type: 'normal' },
                { message: 'take it!', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'you try to use Object 2', type: 'command' },
                { message: 'using', type: 'normal' },
                { message: 'use with object 3', type: 'command' },
                { message: 'used with object 3', type: 'normal' },
                { message: 'you try to use Object 2', type: 'command' },
                { message: 'using', type: 'normal' },
                { message: 'use Object 2 with Object 1', type: 'command' },
                { message: 'Default action', type: 'normal' },
                { message: 'take', type: 'command' },
                { message: 'Taken', type: 'normal' },
                { message: 'Use with', type: 'command' },
                { message: 'using', type: 'normal' },
                { message: 'use Object 3 with Object 1', type: 'command' },
                { message: 'used with object 1', type: 'normal' },
                { message: 'Use with', type: 'command' },
                { message: 'using', type: 'normal' },
                { message: 'use with object 2', type: 'command' },
                { message: 'Nothing happens', type: 'normal' }
            ]
        });
    });

    it('should handle talkable objects', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.action, {});
        game.state.main.objects[0].actions[3].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'talk', type: 'command' },
                { message: 'talking', type: 'normal' }
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

        game.state.action.actions[0].message();

        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'talk', type: 'command' },
                { message: 'talking', type: 'normal' },
                { message: 'talk about Weather', type: 'command' },
                { message: 'Wow, il rains!', type: 'normal' }
            ]
        });
        assert.isTrue(game.state.locked);

        game.state.action.actions[1].message();

        assert.isFalse(game.state.locked);
        assert.notEqual(game.state.main.actions.length, 0);
        assert.notEqual(game.state.main.exits.length, 0);
        assert.notEqual(game.state.main.objects[0].actions.length, 0);
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'Here the adventure begins', type: 'normal' },
                { message: 'talk', type: 'command' },
                { message: 'talking', type: 'normal' },
                { message: 'talk about Weather', type: 'command' },
                { message: 'Wow, il rains!', type: 'normal' },
                { message: 'end conversation', type: 'command' }
            ]
        });

        game.state.out.messages = [];
        game.objects.object1.properties.talkable.objectName = 'the talking object';
        game.state.main.objects[0].actions[3].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'talk to the talking object', type: 'command' },
                { message: 'talking', type: 'normal' }
            ]
        });
        game.state.action.actions[1].message();

        game.state.out.messages = [];
        game.objects.object1.properties.talkable.topics.Weather.available = false;
        game.state.main.objects[0].actions[3].message();
        assert.equal(game.state.action.actions.length, 1);
        assert.equal(game.state.action.actions[0].name, 'Done');
        game.state.action.actions[0].message();

        game.state.out.messages = [];
        game.objects.object1.properties.talkable.topics.Weather.available = true;
        game.objects.object1.properties.talkable.topics.Weather.command = 'you ask about the weather';
        game.objects.object1.properties.talkable.doneName = 'Done button';
        game.objects.object1.properties.talkable.doneCommand = 'suddenly ed the conversation';
        game.objects.object1.properties.talkable.doneMessage = 'You are tired of talking. Bye!';
        game.objects.object1.properties.talkable.title = 'Strange, but talking with an object';
        game.objects.object1.properties.talkable.talkingMessage = '... talking softly ...';
        game.state.main.objects[0].actions[3].message();

        assert.equal(game.state.action.actions[1].name, 'Done button');
        assert.equal(game.state.action.title, 'Strange, but talking with an object');

        game.state.action.actions[0].message();
        game.state.action.actions[1].message();
        assert.deepEqual(game.state.out, {
            messages: [
                { message: 'talk to the talking object', type: 'command' },
                { message: '... talking softly ...', type: 'normal' },
                { message: 'you ask about the weather', type: 'command' },
                { message: 'Wow, il rains!', type: 'normal' },
                { message: 'suddenly ed the conversation', type: 'command' },
                { message: 'You are tired of talking. Bye!', type: 'normal' }
            ]
        });
    });

    it('should be able to end', () => {
        const game = makeGame();
        game.run();

        assert.isFalse(game.state.end);
        game.end();
        assert.isTrue(game.state.end);
    });

    it('should be able to save and restore a game', () => {
        const expected = {
            locationVars: { location1: { var1: 1 }, location2: {} },
            objectVars: { object1: { var2: 2 }, object2: {}, object3: {} },
            objectLocations: {
                object1: '__inventory__',
                object2: 'location1',
                object3: 'location1'
            },
            vars: { var3: 3 },
            currentLocation: 'location2',
            score: 42,
            state: {
                out: {
                    messages: [
                        { message: 'Here the adventure begins', type: 'normal' },
                        { message: 'before move', type: 'normal' },
                        { message: 'take the object', type: 'command' },
                        { message: 'Taken', type: 'normal' },
                        { message: 'after move', type: 'normal' },
                        { message: 'North', type: 'command' },
                        { message: 42, type: 'score' },
                        { message: 'save', type: 'command' }
                    ]
                }
            }
        };

        let game = makeGame();
        game.run();

        game.state.main.objects[0].actions[2].message();
        game.state.main.exits[0].message();
        game.setScore(42);
        const savedGame = game.save();
        const savedGameString = game.save(true);

        assert.deepEqual(savedGame, expected);

        game = makeGame();
        game.run();
        game.restore(savedGame);

        assert.equal(game.score, 42);
        assert.equal(game._currentLocation, 'location2');
        assert.equal(game.state.inventory.objects.length, 1);

        assert.equal(game.save(true), '{"locationVars":{"location1":{"var1":1},"location2":{}},"objectVars":{"object1":{"var2":2},"object2":{},"object3":{}},"objectLocations":{"object1":"__inventory__","object2":"location1","object3":"location1"},"vars":{"var3":3},"currentLocation":"location2","score":42,"state":{"out":{"messages":[{"message":"Here the adventure begins","type":"normal"},{"message":"before move","type":"normal"},{"message":"take the object","type":"command"},{"message":"Taken","type":"normal"},{"message":"after move","type":"normal"},{"message":"North","type":"command"},{"message":42,"type":"score"},{"message":"save","type":"command"},{"message":"Restored","type":"normal"},{"message":"save","type":"command"}]}}}');

        game = makeGame();
        game.run();
        game.restore(savedGameString);
        assert.deepEqual(savedGame, expected);
    });

});
