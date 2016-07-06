const assert = chai.assert;

function makeGame () {
    var game =  new Steller.Web.Game({
        initialMessage: 'Here the adventure begins',
        title: 'My adventure',
        locations: {
            location1: {
                initial: true
            }
        }
    }, $('.container'));
    return game;
}

describe('Steller web game', () => {
    it('should create the html structure within the provided container', function () {
        assert.equal($('.container').html(), undefined);

        const game = makeGame();
        game.run()

        assert.notEqual($('.container').html(), '');
    });
});
