/* istanbul ignore next */
if (this.window === undefined) {
    Steller = require('../src/steller.js');
}

Steller.Lang.en.properties.movable = {
    DROP:    'Drop',
    TAKE:    'Take',
    DROPPED: 'Dropped',
    TAKEN:   'Taken',
};
Steller.Lang.en.properties.usableWith = {
    USE_WITH:     'Use with',
    USE:          'use',
    USE_OBJ:      'use {0}',
    USE_WITH_OBJ: 'use {0} with {1}',
    USING:        'using',
    NOTHING:      'Nothing happens'
};
Steller.Lang.en.properties.talkable = {
    TALK:             'Talk',
    TALK_TO:          'talk to {0}',
    TALK_ABOUT_TOPIC: 'talk about {0}',
    TALK_ABOUT:       'Talk about',
    DONE:             'Done',
    END:              'end conversation',
    TALKING:          'talking'
};

Steller.Lang.it.properties.movable = {
    DROP:    'Lascia',
    TAKE:    'Prendi',
    DROPPED: 'Lasciato',
    TAKEN:   'Preso',
};
Steller.Lang.it.properties.usableWith = {
    USE_WITH: 'Usa con',
    USE: 'usa',
    USE_OBJ: 'usa {0}',
    USE_WITH_OBJ: 'usa {0} con {1}',
    USING: 'usando..,',
    NOTHING: 'Non succede nulla',
};
Steller.Lang.it.properties.talkable = {
    TALK: 'Parla',
    TALK_TO: 'parla con {0}',
    TALK_ABOUT_TOPIC: 'parla di {0}',
    TALK_ABOUT: 'Parla di',
    DONE: 'Fatto',
    END: 'termina conversazione',
    TALKING: 'parlando...',
}

Steller.Properties = {
    movable (obj, game) {
        return {
            [game.objectInInventory(obj.id) ? game.texts.properties.movable.DROP : game.texts.properties.movable.TAKE]: {
                get command () {
                    if (this.hasOwnProperty('objectName')) {
                        return `${game.objectInInventory(obj.id) ? game.texts.properties.movable.DROP.toLowerCase() : game.texts.properties.movable.TAKE.toLowerCase()} ${this.objectName}`;
                    }
                    if (game.objectInInventory(obj.id) && this.hasOwnProperty('dropCommand')) {
                        return this.dropCommand;
                    }
                    if (!game.objectInInventory(obj.id) && this.hasOwnProperty('takeCommand')) {
                        return this.takeCommand;
                    }

                    return game.objectInInventory(obj.id) ? game.texts.properties.movable.DROP.toLowerCase() : game.texts.properties.movable.TAKE.toLowerCase();
                },
                get text () {
                    if (game.objectInInventory(obj.id)) {
                        game.moveObjectToLocation(obj.id);
                        return game.texts.properties.movable.DROPPED;
                    } else {
                        game.moveObjectToInventory(obj.id);
                        return game.texts.properties.movable.TAKEN;
                    }
                }
            }
        };
    },

    usableWith (obj, game) {
        return {
            [game.texts.properties.usableWith.USE_WITH]: {
                get command () {
                    if (this.hasOwnProperty('objectName')) {
                        return Steller.utils.formatText(game.texts.properties.usableWith.USE_WITH, this.objectName);
                    } else {
                        return game.texts.properties.usableWith.USE
                    }
                },
                get text () {
                    const self = this;
                    let actions = [];
                    let availableObjects = Steller.utils.lightMerge(game.objectsInLocation(), game.objectsInInventory());
                    availableObjects = _.pickBy(availableObjects, o => o.id !== obj.id);

                    let interactions = self.hasOwnProperty('interactions') ? self.interactions : {};

                    for (let object in availableObjects) {
                        actions.push({
                            name: availableObjects[object].name,
                            text () {
                                let command = Steller.utils.formatText(game.texts.properties.usableWith.USE_WITH_OBJ, obj.name, availableObjects[object].name);
                                let text = game.texts.properties.usableWith.NOTHING;

                                if (interactions.hasOwnProperty(object)) {
                                    if (interactions[object].hasOwnProperty('command')) command = interactions[object].command;
                                    if (interactions[object].hasOwnProperty('text')) text = interactions[object].text;
                                } else {
                                    if (interactions.hasOwnProperty('default')) text = interactions.default;
                                }

                                game.printCommand(command);
                                game.print(text);
                                game.unlockInteraction();
                                game.state.action = {};
                            }
                        });
                    }

                    game.lockInteraction();
                    game.state.action = {
                        title: self.hasOwnProperty('title') ? self.title : game.texts.properties.usableWith.USE_WITH,
                        actions: actions
                    }
                    return self.hasOwnProperty('usingText') ? self.usingText : game.texts.properties.usableWith.USING;
                },
                get available () {
                    return game.objectInInventory(obj.id);
                }
            }
        }
    },

    talkable (obj, game) {
        return {
            [game.texts.properties.talkable.TALK]: {
                get command () {
                    if (this.hasOwnProperty('objectName')) {
                        return Steller.utils.formatText(game.texts.properties.talkable.TALK_TO, this.objectName);
                    } else {
                        return game.texts.properties.talkable.TALK.toLowerCase();
                    }
                },
                get text () {
                    const self = this;
                    let actions = [];
                    for (let topic in self.topics) {
                        if (self.topics[topic].hasOwnProperty('available') && !self.topics[topic].available) continue;
                        actions.push({
                            name: topic,
                            text () {
                                let command = self.topics[topic].hasOwnProperty('command') ? self.topics[topic].command : Steller.utils.formatText(game.texts.properties.talkable.TALK_ABOUT_TOPIC, topic);

                                game.printCommand(command);
                                game.print(self.topics[topic].text);
                            }
                        })
                    }

                    actions.push({
                        name: self.hasOwnProperty('doneName') ? self.doneName : game.texts.properties.talkable.DONE,
                        text () {
                            let command = self.hasOwnProperty('doneCommand') ? self.doneCommand : game.texts.properties.talkable.END;

                            game.printCommand(command);
                            if (self.hasOwnProperty('doneText')) game.print(self.doneText);
                            game.unlockInteraction();
                            game.state.action = {};
                        }
                    })

                    game.lockInteraction();
                    game.state.action = {
                        title: self.hasOwnProperty('title') ? self.title : game.texts.properties.talkable.TALK_ABOUT,
                        actions: actions
                    }

                    return self.hasOwnProperty('talkingText') ? self.talkingText : game.texts.properties.talkable.TALKING;
                }
            }
        }
    }
};
