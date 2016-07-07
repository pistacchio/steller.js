const Steller = require('../src/steller.js');
const assert = require('chai').assert;

function makeGame (onlyObject=false) {
    let gameObject = {
        initialText: 'Here the adventure begins',
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
                    East: {
                        command: 'go east',
                        text: 'Hmm, seems like you do not want to really go east'
                    }
                },
                actions: {
                    'Wait': 'I am wating',
                    Teleport: {
                        get text () {
                            game.gotoLocation('location2');
                            return 'Teleported'
                        }
                    },
                    Look: {
                        command: 'look around',
                        text: 'Nothing interesting'
                    }
                },
                vars: {
                    var1: 1
                },
                properties: {
                    propertable: {}
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
                        beforeText () {
                            game.print('before text');
                        },
                        afterText () {
                            game.print('after text');
                        },
                        command: 'examining',
                        text: 'examined'
                    },
                    'Read': {
                        command: 'reading',
                        text: 'read'
                    }
                },
                vars: {
                    var2: 2
                }
            },
            object2: {
                name: 'Object 2',
                location: 'location1',
            },
            object3: {
                name: 'Object 3',
                location: 'location1',
                actions: {
                    StupidAction: 'Some stupid action'
                },
                properties: {
                    propertable: {}
                }
            }
        },
        characters: {
            character1: {
                name: 'Character 1'
            }
        },
        vars: {
            var3: 3
        },
        actions: {
            GlobalAction: 'Just a simple global action'
        },
        properties: {
            propertable: {
                lang: {
                    en: {
                        COMMAND: 'use a property',
                        TEXT: 'You just used a property'
                    },
                    it: {
                        COMMAND: 'usa una proprietà',
                        TEXT: 'Hai appena usato una proprietà'
                    }
                },
                apply (target, options, game) {
                    target.actions.SomeProperty = {
                        command: game.texts.properties.propertable.COMMAND,
                        text: game.texts.properties.propertable.TEXT,
                    };
                }
            }
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

    it('should not allow getters in actions', () => {
        let gameObject = makeGame(true);
        gameObject.actions = {
            get BrokenAction () {
                return 'Not working';
            }
        };
        assert.throws(() => new Steller.Game(gameObject), 'Do not use getters for actions. You can customize their behavior using an object instead');

        gameObject = makeGame(true);
        gameObject.locations.location1.actions = {
            get BrokenAction () {
                return 'Not working';
            }
        };
        assert.throws(() => new Steller.Game(gameObject), 'Location "location1": do not use getters for actions. You can customize their behavior using an object instead');

        gameObject = makeGame(true);
        gameObject.objects.object1.actions = {
            get BrokenAction () {
                return 'Not working';
            }
        };
        assert.throws(() => new Steller.Game(gameObject), 'Object "object1": do not use getters for actions. You can customize their behavior using an object instead');
    });

    it('should describe the initial location', () => {
        const game = makeGame();
        game.run();


        assert.deepEqual(game.state.header, { title: 'My adventure', score: 0 });
        assert.equal(game.state.main.name, 'Initial location');
        assert.equal(game.state.main.description, 'Wow, such a beautiful location');
        assert.equal(game.state.main.exits.length, 3);
        assert.equal(game.state.main.exits[0].name, 'North');
        assert.deepEqual(game.state.out, {texts: [{
            text: 'Here the adventure begins',
            type: 'normal'
        }]});
        assert.equal(game.state.main.actions.length, 5);
        assert.equal(game.state.main.actions[0].name, 'Wait');

    });

    it('should merge characters into objects', () => {
        const game = makeGame();
        game.run();

        assert.isTrue(_.keys(game.objects).includes('character1'));
        assert.equal(_.keys(game.objects).length, 4);
    });

    it('should allow object declaration withing locations', () => {
        const gameObject = makeGame(true);
        gameObject.locations.location1.objects = {
            object5: {
                name: 'Object 5'
            }
        };
        const game = new Steller.Game(gameObject);
        game.run();

        assert.equal(game.state.main.objects.length, 4);
        assert.equal(game.state.main.objects[3].name, 'Object 5');
        assert.isTrue(game.objectIsInLocation('object5'));
        assert.isTrue(game.objectIsInLocation('object5', 'location1'));
    });

    it('should allow object declaration withing locations with a shortcut syntax', () => {
        let gameObject = makeGame(true);
        gameObject.locations.location1.objects = {
            get Object5 () { return "A nice object" }
        };
        assert.throws(() => new Steller.Game(gameObject), 'Location "location1": do not use getters for shortcut object declaration.');

        gameObject = makeGame(true);
        gameObject.locations.location1.objects = {
            Object5: "A nice object"
        };
        const game = new Steller.Game(gameObject);
        game.run();

        assert.equal(game.state.main.objects.length, 4);
        assert.equal(game.state.main.objects[3].name, 'Object5');
        assert.equal(game.state.main.objects[3].actions.length, 1);
        assert.equal(game.state.main.objects[3].actions[0].name, 'Examine');
        game.state.main.objects[3].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts:[
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'examine', type: 'command' },
                { text: 'A nice object', type: 'normal' }
            ]
        });
    });


    it('should move in the inventory all objects in options.inventory', () => {
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

    it('should allow global actions', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.out, {
            texts: [
                { text: "Here the adventure begins", "type": "normal"}
            ]
        });
        assert.equal(game.state.main.actions[4].name, 'GlobalAction');
        game.state.main.actions[4].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: "Here the adventure begins", "type": "normal"},
                { text: "globalaction", "type": "command"},
                { text: "Just a simple global action", "type": "normal"}
            ]
        });
    });

    it('should move between locations', () => {
        const game = makeGame();
        game.run();

        assert.isTrue(game.currentLocationIs('location1'));

        game.state.main.exits[1].text();
        assert.equal(game._currentLocation, 'location1');
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'south', type: 'command' },
                { text: 'A message, not a location', type: 'normal' }
            ]}
        );

        game.state.main.exits[0].text();
        assert.equal(game._currentLocation, 'location2');
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'south', type: 'command' },
                { text: 'A message, not a location', type: 'normal' },
                { text: 'north', type: 'command' }
            ]}
        );
        assert.equal(game.state.main.name, 'Second location');
    });

    it('should have configurable exits', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.state.main.exits.length, 3);
        game.state.main.exits[2].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'go east', type: 'command' },
                { text: 'Hmm, seems like you do not want to really go east', type: 'normal' }
            ]
        });

        game.locations.location1.exits.East.available = false;
        game.refreshState();
        assert.equal(game.state.main.exits.length, 2);

        game.locations.location1.exits.East.available = true;
        game.locations.location1.exits.East.direction = 'Same as text';
        game.refreshState();
        game.state.main.exits[2].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'go east', type: 'command' },
                { text: 'Hmm, seems like you do not want to really go east', type: 'normal' },
                { text: 'go east', type: 'command' },
                { text: 'Same as text', type: 'normal' }
            ]
        });
    });

    it('should have configurable locations actions', () => {
        const game = makeGame();
        game.run();

        game.state.main.actions[2].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'look around', type: 'command' },
                { text: 'Nothing interesting', type: 'normal' }
            ]
        });

        game.locations.location1.actions.Look.available = false;
        game.refreshState();
        assert.equal(game.state.main.actions.length, 4);
    });

    it('should have configurable object actions', () => {
        const game = makeGame();
        game.run();

        game.state.main.objects[2].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'stupidaction', type: 'command' },
                { text: 'Some stupid action', type: 'normal' }
            ]
        });
    });

    it('should execute location actions', () => {
        const game = makeGame();
        game.run();

        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' }
            ]}
        );

        game.state.main.actions[0].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'wait', type: 'command' },
                { text: 'I am wating', type: 'normal' }
            ]}
        );

        assert.equal(game._currentLocation, 'location1');
        game.state.main.actions[1].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'wait', type: 'command' },
                { text: 'I am wating', type: 'normal' },
                { text: 'teleport', type: 'command' },
                { text: 'Teleported', type: 'normal' }
            ]
        });
        assert.equal(game._currentLocation, 'location2');
    });

    it('should execute object actions', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.state.main.objects.length, 3);
        assert.equal(game.state.main.objects[0].name, 'Object 1');
        assert.equal(game.state.main.objects[0].actions.length, 2);
        assert.equal(game.state.main.objects[0].actions[0].name, 'Examine');

        game.state.main.objects[0].actions[0].text();
        assert.deepEqual(game.state.out, {
            texts:[
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'before text', type: 'normal' },
                { text: 'examining', type: 'command' },
                { text: 'examined', type: 'normal' },
                { text: 'after text', type: 'normal' },
            ]
        });

        game.state.main.objects[0].actions[1].text();
    });

    it('should handle score', () => {
        const game = makeGame();
        game.run();

        assert.equal(game.score, 0);
        game.setScore(42)
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 42, type: 'score' }
            ]
        })
        assert.equal(game.score, 42);
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
            objectVars: { character1: {}, object1: { var2: 2 }, object2: {}, object3: {} },
            objectLocations: {
                character1: null,
                object1: 'location1',
                object2: 'location1',
                object3: 'location1'
            },
            vars: { var3: 3 },
            currentLocation: 'location2',
            score: 42,
            state: {
                out: {
                    texts: [
                        { text: 'Here the adventure begins', type: 'normal' },
                        { text: 'before text', type: 'normal' },
                        { text: 'examining', type: 'command' },
                        { text: 'examined', type: 'normal' },
                        { text: 'after text', type: 'normal' },
                        { text: 'north', type: 'command' },
                        { text: 42, type: 'score' },
                        { text: 'save', type: 'command' }
                    ]
                }
            }
        };

        let game = makeGame();
        game.run();

        game.state.main.objects[0].actions[0].text();
        game.state.main.exits[0].text();
        game.setScore(42);
        const savedGame = game.save();
        const savedGameString = game.save(true);

        assert.deepEqual(savedGame, expected);

        game = makeGame();
        game.run();
        game.restore(savedGame);

        assert.equal(game.score, 42);
        assert.equal(game._currentLocation, 'location2');

        assert.equal(game.save(true), '{"locationVars":{"location1":{"var1":1},"location2":{}},"objectVars":{"object1":{"var2":2},"object2":{},"object3":{},"character1":{}},"objectLocations":{"object1":"location1","object2":"location1","object3":"location1","character1":null},"vars":{"var3":3},"currentLocation":"location2","score":42,"state":{"out":{"texts":[{"text":"Here the adventure begins","type":"normal"},{"text":"before text","type":"normal"},{"text":"examining","type":"command"},{"text":"examined","type":"normal"},{"text":"after text","type":"normal"},{"text":"north","type":"command"},{"text":42,"type":"score"},{"text":"save","type":"command"},{"text":"Restored","type":"normal"},{"text":"save","type":"command"}]}}}');

        game = makeGame();
        game.run();
        game.restore(savedGameString);
        assert.deepEqual(savedGame, expected);
    });

    it('should be lockable', () => {
        const gameObject = makeGame(true);
        gameObject.objects.object4 = {
            name: 'Object 4',
            actions: {
                'Done': {
                    text: 'Done'
                }
            }
        };
        gameObject.inventory = [
            'object4'
        ];

        const game = new Steller.Game(gameObject);
        game.run();

        assert.isFalse(game.state.locked);
        assert.equal(game.state.main.exits.length, 3);
        assert.equal(game.state.main.objects[0].actions.length, 2);
        assert.equal(game.state.main.actions.length, 5);
        assert.equal(game.state.inventory.objects[0].actions.length, 1);

        game.lockInteraction()
        assert.isTrue(game.state.locked);
        assert.equal(game.state.main.actions.length, 0);
        assert.equal(game.state.main.exits.length, 0);
        assert.equal(game.state.main.objects[0].actions.length, 0);
        assert.equal(game.state.inventory.objects[0].actions.length, 0);

        game.unlockInteraction()
    });

    it('should have movable objects', () => {
        let game = makeGame();
        game.run();

        assert.equal(game.objects.object1.location, 'location1');
        game.moveObjectToLocation('object1', 'location2');
        assert.equal(game.objects.object1.location, 'location2');
        game.moveObjectToLocation('object1');
        assert.equal(game.objects.object1.location, 'location1');
        assert.isFalse(game.objectInInventory('object1'));
        game.moveObjectToInventory('object1');
        assert.isTrue(game.objectInInventory('object1'));
    });

    it('should support text formatting as an utility', () => {
        assert.equal(Steller.utils.formatText('Some text'), 'Some text');
        assert.equal(Steller.utils.formatText('Some {0} text', 'inserted'), 'Some inserted text');
        assert.equal(Steller.utils.formatText('Some {0} {1} text', 'other', 'inserted'), 'Some other inserted text');
        assert.equal(Steller.utils.formatText('Some {0} {0} {1} text', 'duplicated', 'inserted'), 'Some duplicated duplicated inserted text');
    });

    it('should be extensible with properties', () => {
        let game = makeGame();
        game.run();

        assert.equal(game.texts.properties.propertable.COMMAND, game.properties.propertable.lang.en.COMMAND);

        assert.equal(game.state.main.objects[2].actions.length, 2);
        assert.equal(game.state.main.objects[2].actions[1].name, 'SomeProperty');
        game.state.main.objects[2].actions[1].text();
        assert.deepEqual(game.state.out, {
            texts: [
                { text: 'Here the adventure begins', type: 'normal' },
                { text: 'use a property', type: 'command' },
                { text: 'You just used a property', type: 'normal' }
            ]
        });
    });
});
