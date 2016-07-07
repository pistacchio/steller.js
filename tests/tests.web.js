$('body').append('<div id="container"></div>');

function makeGame () {
    var game =  new Steller.Web.Game({
        initialText: 'Here the adventure begins',
        title: 'My adventure',
        score: 42,
        locations: {
            location1: {
                initial: true,
                name: 'My first location',
                description: 'Location description',
                actions: {
                    Wait: 'waiting'
                },
                exits: {
                    North: 'location2'
                }
            },
            location2: {
                name: 'My second location',
                exits: {
                    South: 'location1'
                }
            }
        },
        objects: {
            object1: {
                name: 'Object 1',
                location: 'location1',
                actions: {
                    Take: 'taken'
                },
                properties: {
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
            }
        },
        inventory: [
            'object2'
        ]
    }, $('#container'));
    return game;
}

describe('Steller web game', () => {
    it('should create the html structure within the provided container', function () {
        assert.equal($('#container').html(), '');

        const game = makeGame();
        game.run();

        // call game.state objects to remove useless coverage warning
        let fake = game.state.main;
        fake = game.state.inventory;
        fake = game.state.end;
        fake = game.state.action;
        fake = game.state.action;

        assert.notEqual($('#container').html(), '');
    });

    it('should display title and score', function () {
        const game = makeGame();
        game.run();

        assert.equal($('#container .header .title').text(), 'My adventure');
        assert.equal($('#container .header .score').text(), 'Score: 42');
    });

    it('should display the initial text', function () {
        const game = makeGame();
        game.run();

        assert.equal($('#container .output').text(), 'Here the adventure begins');
    });

    it('should use formatters', function () {
        const game = makeGame();
        game.run();

        $('#container .main .objects a').eq(1).click();
        $('#container .actions a').eq(0).click();

        assert.equal($('#container .output .dialogue').html(), '<em>"Wow, il rains!"</em>');
    });

    it('should display locations', function () {
        const game = makeGame();
        game.run();

        assert.equal($('#container .main .name').text(), 'My first location');
        assert.equal($('#container .main p').text(), 'Location description');
        assert.equal($('#container .main .exits').text(), 'North');
        assert.equal($('#container .main .actions').text(), 'Wait');
        assert.equal($('#container .main .objects').text(), 'Object 1TakeTalk');
        assert.equal($('#container .inventory .objects').text(), 'Object 2');
    });

    it('should execute location actions and navigate', function () {
        const game = makeGame();
        game.run();

        assert.equal($('#container .output').text(), 'Here the adventure begins');
        $('#container .main .actions a').click();
        assert.equal($('#container .output').text(), 'Here the adventure begins> waitwaiting');

        $('#container .main .exits a').click();

        assert.equal($('#container .output').text(), 'Here the adventure begins> waitwaiting> north');
        assert.equal($('#container .main .name').text(), 'My second location');
    });

    it('should log score', function () {
        const game = makeGame();
        game.run();

        game.setScore('69');

        assert.equal($('#container .output').text(), 'Here the adventure beginsYour score just went up to 69!');
    });

    it('should display actions', function () {
        const game = makeGame();
        game.run();

        assert.equal($('#container .sidebar > .action').text(), '');
        $('#container .main .objects .action').eq(1).click();
        assert.notEqual($('#container .sidebar > .action').text(), '');
    });

    it('should end the game', function () {
        const game = makeGame();
        game.run();

        assert.notEqual($('#container .sidebar a').length, 0);
        game.end();
        assert.equal($('#container .sidebar a').length, 0);
    });

    it('should save and restore the game', function () {
        const game = makeGame();
        game.run();

        localStorage.removeItem('gamedata');
        assert.equal(localStorage.getItem('gamedata'), undefined);

        $('#container .footer a').eq(0).click();
        assert.notEqual(localStorage.getItem('gamedata'), undefined);

        // move to the second location and save
        assert.equal($('#container .main .name').text(), 'My first location');
        $('#container .main .exits a').click();
        assert.equal($('#container .main .name').text(), 'My second location');
        $('#container .footer a').eq(0).click();

        // back to the first location
        $('#container .main .exits a').click();
        assert.equal($('#container .main .name').text(), 'My first location');

        // restore and it should be back to the second location
        $('#container .footer a').eq(1).click();
        assert.equal($('#container .main .name').text(), 'My second location');
    });

});
