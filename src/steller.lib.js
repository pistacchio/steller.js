/* istanbul ignore next */
if (this.window === undefined) {
    Steller = require('../src/steller.js');
}

Steller.Properties = {
    movable: {
        lang: {
            en: {
                DROP:    'Drop',
                TAKE:    'Take',
                DROPPED: 'Dropped',
                TAKEN:   'Taken',
            },
            it: {
                DROP:    'Lascia',
                TAKE:    'Prendi',
                DROPPED: 'Lasciato',
                TAKEN:   'Preso',
            }
        },
        apply (target, options, game) {
            target.actions[game.texts.properties.movable.TAKE] = {
                get command () {
                    if ('takeCommand' in options) {
                        return options.takeCommand;
                    }
                    if ('objectName' in options) {
                        return `${game.texts.properties.movable.TAKE.toLowerCase()} ${options.objectName}`;
                    }
                    return game.texts.properties.movable.TAKE.toLowerCase();
                },
                get text () {
                    game.moveObjectToInventory(target.id);
                    if ('takeText' in options) {
                        return options.takeText;
                    }
                    return game.texts.properties.movable.TAKEN;
                },
                get available () {
                    return options.available !== false && !game.objectInInventory(target.id);
                }
            };

            target.actions[game.texts.properties.movable.DROP] = {
                get command () {
                    if ('dropCommand' in options) {
                        return options.dropCommand;
                    }
                    if ('objectName' in options) {
                        return `${game.texts.properties.movable.DROP.toLowerCase()} ${options.objectName}`;
                    }
                    return game.texts.properties.movable.DROP.toLowerCase();
                },
                get text () {
                    game.moveObjectToLocation(target.id);
                    if ('dropText' in options) {
                        return options.dropText;
                    }
                    return game.texts.properties.movable.DROPPED;
                },
                get available () {
                    return options.available !== false && game.objectInInventory(target.id);
                }
            };
        }
    },

    usableWith: {
        lang: {
            en: {
                USE_WITH:     'Use with',
                USE:          'use',
                USE_OBJ:      'use {0}',
                USE_WITH_OBJ: 'use {0} with {1}',
                USING:        'using',
                NOTHING:      'Nothing happens'
            },
            it: {
                USE_WITH: 'Usa con',
                USE: 'usa',
                USE_OBJ: 'usa {0}',
                USE_WITH_OBJ: 'usa {0} con {1}',
                USING: 'usando..,',
                NOTHING: 'Non succede nulla',
            }
        },
        apply (target, options, game) {
            target.actions[game.texts.properties.usableWith.USE_WITH] = {
                get command () {
                    if ('command' in options) {
                        return options.command;
                    }

                    if ('objectName' in options) {
                        return Steller.utils.formatText(game.texts.properties.usableWith.USE_WITH, options.objectName);
                    } else {
                        return game.texts.properties.usableWith.USE;
                    }
                },
                get text () {
                    const self = this;
                    let actions = [];
                    let availableObjects = Steller.utils.lightMerge(game.objectsInLocation(), game.objectsInInventory());
                    availableObjects = _.pickBy(availableObjects, o => o.id !== target.id);

                    let interactions = 'interactions' in options ? options.interactions : {};

                    for (let object in availableObjects) {
                        actions.push({
                            name: availableObjects[object].name,
                            text () {
                                let command = Steller.utils.formatText(game.texts.properties.usableWith.USE_WITH_OBJ, target.name, availableObjects[object].name);

                                let text = game.texts.properties.usableWith.NOTHING;

                                if (object in interactions) {
                                    if ('command' in interactions[object]) command = interactions[object].command;
                                    if ('text' in interactions[object]) text = interactions[object].text;
                                } else {
                                    if ('default' in interactions) text = interactions.default;
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
                        title: 'title' in options ? options.title : game.texts.properties.usableWith.USE_WITH,
                        actions: actions
                    }
                    return 'usingText' in options ? options.usingText : game.texts.properties.usableWith.USING;
                },
                get available () {
                    return options.available !== false && game.objectInInventory(target.id);
                }
            }
        }
    },

    talkable: {
        lang: {
            en: {
                TALK:             'Talk',
                TALK_TO:          'talk to {0}',
                TALK_ABOUT_TOPIC: 'talk about {0}',
                TALK_ABOUT:       'Talk about',
                DONE:             'Done',
                END:              'end conversation',
                TALKING:          'talking'
            },
            it: {
                TALK: 'Parla',
                TALK_TO: 'parla con {0}',
                TALK_ABOUT_TOPIC: 'parla di {0}',
                TALK_ABOUT: 'Parla di',
                DONE: 'Fatto',
                END: 'termina conversazione',
                TALKING: 'parlando...',
            }
        },
        apply (target, options, game) {
            game.forceStopDialogue = () => {
                game.unlockInteraction();
                game.state.action = {};
            };

            target.actions[game.texts.properties.talkable.TALK] = {
                get command () {
                    if ('objectName' in options) {
                        return Steller.utils.formatText(game.texts.properties.talkable.TALK_TO, options.objectName);
                    } else {
                        return game.texts.properties.talkable.TALK.toLowerCase();
                    }
                },
                get text () {
                    const self = this;
                    let actions = [];
                    for (let topic in options.topics) {
                        if ('available' in options.topics[topic] && !options.topics[topic].available) continue;
                        actions.push({
                            name: topic,
                            text () {
                                let command = 'command' in options.topics[topic] ? options.topics[topic].command : Steller.utils.formatText(game.texts.properties.talkable.TALK_ABOUT_TOPIC, topic);

                                game.printCommand(command);
                                game.print(options.topics[topic].text, 'dialogue');
                                if ('afterText' in options.topics[topic]) options.topics[topic].afterText();
                            }
                        })
                    }

                    actions.push({
                        name: 'doneName' in options ? options.doneName : game.texts.properties.talkable.DONE,
                        text () {
                            let command = 'doneCommand' in options ? options.doneCommand : game.texts.properties.talkable.END;

                            game.printCommand(command);
                            if ('doneText' in options) game.print(options.doneText);
                            game.forceStopDialogue();
                        }
                    });

                    game.lockInteraction();
                    game.state.action = {
                        title: 'title' in options ? options.title : game.texts.properties.talkable.TALK_ABOUT,
                        actions: actions
                    };

                    return 'talkingText' in options ? options.talkingText : game.texts.properties.talkable.TALKING;
                },
                get available () {
                    return options.available !== false;
                }
            }
        }
    },

    changeableState: {
        apply (target, options, game) {
            let stateName = options.stateName || 'state';
            target.vars[stateName] = options.initialState || 0;

            for (let i = 0; i < options.states.length; i++) {
                let state = options.states[i];
                target.actions[state.name] = {
                    get command () {
                        return state.command || options.command || state.name.toLowerCase();
                    },
                    get text () {
                        let newState = i + 1 < options.states.length ? i + 1 : 0;
                        if ('beforeStateChange' in options) {
                            newState = options.beforeStateChange(newState, i) || newState;
                        }
                        target.vars[stateName] = newState;
                        return state.text || options.text;
                    },
                    get available () {
                        return options.available !== false && target.vars[stateName] === i;
                    }
                };
            }
        }
    }
};
