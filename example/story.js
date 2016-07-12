function darkWalking () {
    game.objects.message.vars.damages += 2;
    return "Blundering around in the dark isn't a good idea!";
}

function darkWarning () {
    game.objects.message.vars.damages += 1;
    return "In the dark? You could easily disturb something!";
}

const game = new Steller.Web.Game({
    title: 'Cloak of Darkness',
    score: 0,
    initialText: `Hurrying through the rainswept November night, you're glad to see
        the bright lights of the Opera House. It's surprising that there aren't
        more people about but, hey, what do you expect in a cheap demo game...?
        <div style="text-align: center">Cloak of Darkness</div>
        <div style="text-align: center">A basic IF demonstration</div>`,
    locations: {
        foyer: {
            initial: true,
            name: 'Foyer of the Opera House',
            description: `You are standing in a spacious hall, splendidly decorated in red and
                gold, with glittering chandeliers overhead. The entrance from the
                street is to the north, and there are doorways south and west.`,
            exits: {
                North: "You've only just arrived, and besides, the weather outside seems to be getting worse",
                South: {
                    get text () {
                        return game.objectInInventory('cloak') ? 'darkBar' : 'bar';
                    }
                },
                West: 'cloakroom'
            }
        },

        cloakroom: {
            name: 'Cloak room',
            description: `The walls of this small room were clearly once lined with hooks,
                though now only one remains. The exit is a door to the east.`,
            exits: {
                East: 'foyer'
            }
        },

        bar: {
            name: 'Bar',
            description: `The bar, much rougher than you'd have guessed after the opulence of
                the foyer to the north, is completely empty. There seems to be some
                sort of message scrawled in the sawdust on the floor.`,
            exits: {
                North: 'foyer'
            }
        },

        darkBar: {
            name: 'Darkness',
            description: `It's pitch black here. You can't see a thing`,
            exits: {
                North: 'foyer',
                get South () { return darkWalking(); },
                get West () { return darkWalking(); },
                get East () { return darkWalking(); }
            },
            actions: {
                Examine: {
                    get text () {
                        return darkWarning();
                    }
                },
                Wait: {
                    get text () {
                        return darkWarning();
                    }
                },
                'Turn on the light': {
                    get text () {
                        return darkWarning();
                    }
                },
                'Search': {
                    get text () {
                        return darkWarning();
                    }
                }
            }
        }
    },

    objects: {
        hook: {
            name: 'Hook',
            location: 'cloakroom',
            actions: {
                'Examine': {
                    command: 'examine the hook',
                    get text () {
                        if (game.objects.cloak.vars.onHook) game.moveObjectToLocation('cloak');
                        return `A small brass hook ${game.objects.cloak.vars.onHook ? 'with a cloak hangin on it' : 'screwed to the wall'}`;
                    }
                }
            }
        },

        cloak: {
            name: 'Black cloak',
            actions: {
                'Examine': {
                    command: 'examine the cloak',
                    text: `A handsome cloak, of velvet trimmed with satin, and slightly
                        spattered with raindrops. Its blackness is so deep that it almost
                        seems to suck light from the room.`
                }
            },
            properties: {
                movable: {
                    objectName: 'the cloak',
                    beforeText () {
                        game.objects.cloak.vars.onHook = false;
                    }
                },
                usableWith: {
                    command: 'try to use the cloak',
                    interactions: {
                        hook: {
                            command: 'use the cloak with the hook',
                            get text () {
                                game.objects.cloak.vars.onHook = true;
                                game.moveObjectToLocation('cloak');
                                return 'The cloak is now on the hook again';
                            }
                        },
                        default: 'Not an useful way to use such a nice cloak!',
                    }
                }
            },
            vars: {
                onHook: true
            }
        },

        message: {
            name: 'Message',
            location: 'bar',
            actions: {
                Read: {
                    command: 'read the message',
                    get text () {
                        game.end();
                        if (game.objects.message.vars.damages < 2) {
                            game.setScore(game.score + 1);
                            return 'The message, neatly marked in the sawdust, reads...<br> <div style="text-align: center;">You have won</span>';
                        } else {
                            return 'The message has been carelessly trampled, making it difficult to read. You can just distinguish the words<br> <div style="text-align: center;">You have lost</span>';
                        }
                    }
                }
            },
            vars: {
                damages: 0
            }
        },

        statue: {
            name: 'Talking statue',
            location: 'foyer',
            properties: {
                talkable: {
                    objectName: 'the talking statue',
                    topics: {
                        'Weather': {
                            text: 'Wow, il rains!'
                        }
                    },
                    command: 'Talking with the statue',
                    doneText: 'You say goodbye',
                    doneName: 'Ok, enough'
                }
            }
        }
    },
    actions: {
        Wait: 'You wait for a little while'
    }
}, $('#container'));

game.run();
