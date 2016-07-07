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
                    if (options.hasOwnProperty('takeCommand')) {
                        return options.takeCommand;
                    }
                    if (options.hasOwnProperty('objectName')) {
                        return `${game.texts.properties.movable.TAKE.toLowerCase()} ${options.objectName}`;
                    }
                    return game.texts.properties.movable.TAKE.toLowerCase();
                },
                get text () {
                    game.moveObjectToInventory(target.id);
                    if (options.hasOwnProperty('takeText')) {
                        return options.takeText;
                    }
                    return game.texts.properties.movable.TAKEN;
                },
                get available () {
                    return !game.objectInInventory(target.id);
                }
            };

            target.actions[game.texts.properties.movable.DROP] = {
                get command () {
                    if (options.hasOwnProperty('dropCommand')) {
                        return options.dropCommand;
                    }
                    if (options.hasOwnProperty('objectName')) {
                        return `${game.texts.properties.movable.DROP.toLowerCase()} ${options.objectName}`;
                    }
                    return game.texts.properties.movable.DROP.toLowerCase();
                },
                get text () {
                    game.moveObjectToLocation(target.id);
                    if (options.hasOwnProperty('dropText')) {
                        return options.dropText;
                    }
                    return game.texts.properties.movable.DROPPED;
                },
                get available () {
                    return game.objectInInventory(target.id);
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
                    if (options.hasOwnProperty('command')) {
                        return options.command;
                    }

                    if (options.hasOwnProperty('objectName')) {
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

                    let interactions = options.hasOwnProperty('interactions') ? options.interactions : {};

                    for (let object in availableObjects) {
                        actions.push({
                            name: availableObjects[object].name,
                            text () {
                                let command = Steller.utils.formatText(game.texts.properties.usableWith.USE_WITH_OBJ, target.name, availableObjects[object].name);

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
                        title: options.hasOwnProperty('title') ? options.title : game.texts.properties.usableWith.USE_WITH,
                        actions: actions
                    }
                    return options.hasOwnProperty('usingText') ? options.usingText : game.texts.properties.usableWith.USING;
                },
                get available () {
                    return game.objectInInventory(target.id);
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
            target.actions[game.texts.properties.talkable.TALK] = {
              get command () {
                  if (options.hasOwnProperty('objectName')) {
                      return Steller.utils.formatText(game.texts.properties.talkable.TALK_TO, options.objectName);
                  } else {
                      return game.texts.properties.talkable.TALK.toLowerCase();
                  }
              },
              get text () {
                  const self = this;
                  let actions = [];
                  for (let topic in options.topics) {
                      if (options.topics[topic].hasOwnProperty('available') && !options.topics[topic].available) continue;
                      actions.push({
                          name: topic,
                          text () {
                              let command = options.topics[topic].hasOwnProperty('command') ? options.topics[topic].command : Steller.utils.formatText(game.texts.properties.talkable.TALK_ABOUT_TOPIC, topic);

                              game.printCommand(command);
                              game.print(options.topics[topic].text, 'dialogue');
                          }
                      })
                  }

                  actions.push({
                      name: options.hasOwnProperty('doneName') ? options.doneName : game.texts.properties.talkable.DONE,
                      text () {
                          let command = options.hasOwnProperty('doneCommand') ? options.doneCommand : game.texts.properties.talkable.END;

                          game.printCommand(command);
                          if (options.hasOwnProperty('doneText')) game.print(options.doneText);
                          game.unlockInteraction();
                          game.state.action = {};
                      }
                  })

                  game.lockInteraction();
                  game.state.action = {
                      title: options.hasOwnProperty('title') ? options.title : game.texts.properties.talkable.TALK_ABOUT,
                      actions: actions
                  }

                  return options.hasOwnProperty('talkingText') ? options.talkingText : game.texts.properties.talkable.TALKING;
              }
          }
      }
  }
};
