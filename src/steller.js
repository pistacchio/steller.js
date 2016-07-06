/* istanbul ignore next */
_ = this.window === undefined ? require('lodash') : _;

const Steller = {
    INVENTORY: '__inventory__',
    Game: class {
        constructor (options) {
            this.lang              = _.get(options, 'lang', 'en');
            this.initialText       = _.get(options, 'initialText', '');
            this.locations         = _.get(options, 'locations', {});
            this.objects           = _.get(options, 'objects', {});
            this._currentLocation  = _.get(options, 'currentLocation', null);
            this.vars              = _.get(options, 'vars', {});
            this.actions           = _.get(options, 'actions', {});
            this.score             = _.get(options, 'score', null);
            this.title             = _.get(options, 'title', '');
            this.properties        = _.get(options, 'properties', {});
            this.everyturn         = _.get(options, 'everyturn', () => {});
            this.texts             = Steller.Lang[this.lang];

            this.state = {
                header:    {
                    title: this._title,
                    score: this._score
                },
                footer:    {},
                main:      {},
                out:       {
                    texts: []
                },
                action:    {},
                inventory: {
                    objects: []
                },
                end: false,
                locked: false
            };

            // prepare locations
            this.locations = _.mapValues(this.locations, (l, name) => {
                return Steller.utils.lightMerge(l, {
                    id:          name,
                    initial:     false,
                    description: '',
                    exits:       [],
                    vars:        {},
                    actions:     {}
                });
            });

            this.objects = Steller.utils.lightMerge(this.objects, _.get(options, 'characters', {}));

            // prepare objects
            this.objects = _.mapValues(this.objects, (o, name) => {
                return Steller.utils.lightMerge(o, {
                    id:         name,
                    name:       {},
                    location:   null,
                    actions:    {},
                    vars:       {},
                    properties: {},
                });
            });

            this.properties = Steller.utils.lightMerge(Steller.DefaultProperties, this.properties);

            for (let object of _.get(options, 'inventory', [])) {
                this.objects[object].location = Steller.INVENTORY;
            }
        }

        get currentLocation () { return this.locations[this._currentLocation]; }
        set currentLocation (val) { this._currentLocation = val; }

        run () {
            // set initial location or throw error
            if (! (this.currentLocation = _.findKey(this.locations, l => l.initial))) throw('No initial location');

            this.state.header = {
                title: this.title,
                score: this.score
            };

            this.print(this.initialText);
            this.refreshOutput();
        }

        describeCurrentLocation () {
            // actions
            let actions = this.state.locked ? [] : this.currentLocation.actions;
            const globalActions = this.state.locked ? [] : this.actions;
            actions = Steller.utils.lightMerge(actions, globalActions);
            const outputActions = []
            for (let action in actions) {
                outputActions.push({
                    name: action,
                    text: () => {
                        this.printCommand(action);
                        this.print(actions[action]);
                    }
                });
            }


            // exits
            const exits = this.state.locked ? [] : this.currentLocation.exits;
            const outputExits = [];
            for (let exit in exits) {
                outputExits.push({
                    name: exit,
                    text: () => {
                        this.gotoLocation(exits[exit], exit);
                    }
                });
            }

            // objects
            const objects = this.objectsInLocation();
            const outputObjects = [];
            for (let object in objects) {
                outputObjects.push(this.prepareObject(objects[object]));
            }

            this.state.main = {
                name: this.currentLocation.name,
                description: this.currentLocation.description,
                exits: outputExits,
                objects: outputObjects,
                actions: outputActions
            };

        }

        prepareObject (obj) {
            let actions = [];
            const self = this;

            if (!this.state.locked) {
                let availableActions = _.pickBy(obj.actions, a => a.available !== false);

                for (let propertyName in obj.properties) {
                    let properties = this.properties[propertyName](obj, self);
                    for (let property in properties) {
                        properties[property] = Steller.utils.lightMerge(obj.properties[propertyName], properties[property]);
                        properties[property] = Steller.utils.lightMerge(properties[property], {
                            command:       '',
                            text:          '',
                            available:     true,
                            beforeText:    () => '',
                            afterText:     () => ''
                        });
                    }
                    availableActions = Steller.utils.lightMerge(availableActions, properties);
                }

                availableActions = _.pickBy(availableActions, a => a.available !== false);

                actions = _.map(availableActions, (action, actionName) => {
                    return {
                        name: actionName,
                        text: () => {
                            if (action.hasOwnProperty('beforeText')) action.beforeText();
                            self.printCommand(action.command);
                            self.print(action.text);
                            if (action.hasOwnProperty('afterText')) action.afterText();
                        }
                    };
                });

            }

            return {
                name: obj.name,
                actions: actions
            };
        }

        print (text, type) {
            this.state.out = {
                texts: this.state.out.texts.concat([{
                    text: text,
                    type: type || 'normal'
                }])
            }
        }

        printCommand (text) {
            this.print(text, 'command');
            this.everyturn();
        }

        printScore () {
            this.print(this.score, 'score');
        }

        gotoLocation (location, command) {
            if (command !== undefined) this.printCommand(command);

            if (this.locations.hasOwnProperty(location)) {
                this.currentLocation = location;
                this.refreshOutput();
            } else {
                this.print(location);
            }
        }

        currentLocationIs (location) {
            return this._currentLocation === location;
        }

        objectInInventory (objectName) {
            return this.objects[objectName].location === Steller.INVENTORY;
        }

        updateInventory () {
            this.state.inventory = {
                objects: _.map(this.objectsInInventory(), o => this.prepareObject(o))
            }
        }

        objectsInInventory () {
            return this.objectsInLocation(Steller.INVENTORY);
        }

        objectsInLocation (locationName) {
            if (locationName === undefined) locationName = this._currentLocation;
            return _.pickBy(this.objects, o => o.location === locationName);
        }

        moveObjectToLocation (objectName, locationName) {
            if (locationName === undefined) locationName = this._currentLocation;
            const object = this.objects[objectName];

            object.location = locationName;
            this.refreshOutput();
        }

        moveObjectToInventory (objectName) {
            this.moveObjectToLocation(objectName, Steller.INVENTORY);
        }

        refreshOutput () {
            this.describeCurrentLocation();
            this.updateInventory();
        }

        setScore (value) {
            let newHeader = this.state.header;
            newHeader.score = value;

            this.score = value;
            this.state.header = newHeader;
            this.printScore();
        }

        lockInteraction () {
            this.state.locked = true;
            this.refreshOutput();
        }

        unlockInteraction () {
            this.state.locked = false;
            this.refreshOutput();
        }

        end () {
            this.state.end = true;
        }

        save (string=false) {
            this.printCommand(this.texts.SAVE);
            const locationVars = {};
            const objectVars = {};
            const objectLocations = {};

            for (let location in this.locations) {
                locationVars[location] = this.locations[location].vars;
            }
            for (let object in this.objects) {
                objectVars[object] = this.objects[object].vars;
                objectLocations[object] = this.objects[object].location;
            }

            const obj = {
                locationVars: locationVars,
                objectVars: objectVars,
                objectLocations: objectLocations,
                vars: this.vars,
                currentLocation: this._currentLocation,
                score: this.score,
                state: {
                    out: {
                        texts: this.state.out.texts
                    }
                }
            };
            this.print(this.texts.SAVED);
            return string ? JSON.stringify(obj) : obj;
        }

        restore (data) {
            if (_.isString(data)) data = JSON.parse(data);

            this.printCommand(this.texts.RESTORE);

            for (let location in this.locations) {
                this.locations[location].vars = data.locationVars[location];
            }
            for (let object in this.objects) {
                this.objects[object].vars = data.objectVars[object];
                this.objects[object].location = data.objectLocations[object];
            }

            this.vars = data.vars;
            this._currentLocation = data.currentLocation;
            this.score = data.score;
            this.state.out.texts = data.state.out.texts;
            this.state.locked = false;
            this.refreshOutput();
            this.print(this.texts.RESTORED);
        }
    },

    utils: {
        lightMerge (obj, source) {
            for (let prop in source) {
                if (!obj.hasOwnProperty(prop)) {
                    Object.defineProperty(obj, prop, Object.getOwnPropertyDescriptor(source, prop));
                }
            }

            return obj;
        },

        translate (str, ...rest) {
            for (let i = 0; i < rest.length; i++) {
                str = str.replace(`{${i}}`, rest[i]);
            }
            return str;
        }
    },

    DefaultProperties: {
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
                            return Steller.utils.translate(game.texts.properties.usableWith.USE_WITH, this.objectName);
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
                                    let command = Steller.utils.translate(game.texts.properties.usableWith.USE_WITH_OBJ, obj.name, availableObjects[object].name);
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
                            return Steller.utils.translate(game.texts.properties.talkable.TALK_TO, this.objectName);
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
                                    let command = self.topics[topic].hasOwnProperty('command') ? self.topics[topic].command : Steller.utils.translate(game.texts.properties.talkable.TALK_ABOUT_TOPIC, topic);

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
    },

    Lang: {
        en: {
            SAVE:     'save',
            RESTORE:  'restore',
            SAVED:    'Saved',
            RESTORED: 'Restored',

            properties: {
                movable: {
                    DROP:    'Drop',
                    TAKE:    'Take',
                    DROPPED: 'Dropped',
                    TAKEN:   'Taken',
                },
                usableWith: {
                    USE_WITH: 'Use with',
                    USE: 'use',
                    USE_OBJ: 'use {0}',
                    USE_WITH_OBJ: 'use {0} with {1}',
                    USING: 'using',
                    NOTHING: 'Nothing happens',
                },
                talkable: {
                    TALK: 'Talk',
                    TALK_TO: 'talk to {0}',
                    TALK_ABOUT_TOPIC: 'talk about {0}',
                    TALK_ABOUT: 'Talk about',
                    DONE: 'Done',
                    END: 'end conversation',
                    TALKING: 'talking',
                }
            },

            ui: {
                SAVE: 'Save',
                RESTORE: 'Restore',
                EXITS: 'Exits',
                YOU_SEE: 'You can also see',
                ACTIONS: 'Actions',
                SCORE_UP: 'Your score just went up to {0}!',
                SCORE: 'Score',
                INVENTORY: 'You carry'
            }
        },
        it: {
            SAVE:     'salva',
            RESTORE:  'ricarica',
            SAVED:    'Salvato',
            RESTORED: 'Ricaricato',

            properties: {
                movable: {
                    DROP:    'Lascia',
                    TAKE:    'Prendi',
                    DROPPED: 'Lasciato',
                    TAKEN:   'Preso',
                },
                usableWith: {
                    USE_WITH: 'Usa con',
                    USE: 'usa',
                    USE_OBJ: 'usa {0}',
                    USE_WITH_OBJ: 'usa {0} con {1}',
                    USING: 'usando..,',
                    NOTHING: 'Non succede nulla',
                },
                talkable: {
                    TALK: 'Parla',
                    TALK_TO: 'parla con {0}',
                    TALK_ABOUT_TOPIC: 'parla di {0}',
                    TALK_ABOUT: 'Parla di',
                    DONE: 'Fatto',
                    END: 'termina conversazione',
                    TALKING: 'parlando...',
                }
            },

            ui: {
                SAVE: 'Salva',
                RESTORE: 'Ricarica',
                EXITS: 'Uscite',
                YOU_SEE: 'Vedi anche',
                ACTIONS: 'Azioni',
                SCORE_UP: 'Il tuo punteggio è appena saluto a {0}!',
                SCORE: 'Punteggio',
                INVENTORY: 'Hai'
            }
        },
    }
};

/* istanbul ignore next */
if (this.window === undefined) {
    module.exports = Steller;
}
