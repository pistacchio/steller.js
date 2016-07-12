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
            this.formatters        = _.get(options, 'formatters', {});

            this.characters        = this.objects;

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

            this.properties = Steller.utils.lightMerge(Steller.Properties, this.properties);
            let formatters = Steller.utils.lightMerge(Steller.Formatters, this.formatters);
            for (let formatter in formatters) {
                this.formatters[formatter] = formatters[formatter][this.lang];
            }

            // extend lang for properties
            for (let property in this.properties) {
                if ('lang' in this.properties[property]) {
                    this.texts.properties[property] = this.properties[property].lang[this.lang];
                }
            }

            // prepare locations
            this.locations = _.mapValues(this.locations, (l, name) => {
                let location = Steller.utils.lightMerge(l, {
                    id:          name,
                    initial:     false,
                    description: '',
                    exits:       [],
                    vars:        {},
                    actions:     {},
                    properties:  {}
                });

                for (let property in location.properties) {
                    this.properties[property].apply(location, location.properties[property], this);
                }

                for (let action in location.actions) {
                    if (Object.getOwnPropertyDescriptor(location.actions, action).get !== undefined) {
                        throw(`Location "${name}": do not use getters for actions. You can customize their behavior using an object instead`);
                    }
                }

                for (let object in location.objects) {
                    if (Object.getOwnPropertyDescriptor(location.objects, object).get !== undefined) {
                        throw(`Location "${name}": do not use getters for shortcut object declaration.`);
                    }

                    if (_.isString(location.objects[object])) {
                        this.objects[Steller.utils.guid('object')] = {
                            name: object,
                            location: name,
                            actions: {
                                [this.texts.EXAMINE]: location.objects[object]
                            }
                        }
                    } else {
                        location.objects[object].location = location.objects[object].location || name;
                        this.objects[object] = location.objects[object];
                    }
                }

                return location;
            });

            this.objects = Steller.utils.lightMerge(this.objects, _.get(options, 'characters', {}));

            // prepare objects
            this.objects = _.mapValues(this.objects, (o, name) => {
                let object = Steller.utils.lightMerge(o, {
                    id:         name,
                    name:       {},
                    location:   null,
                    actions:    {},
                    vars:       {},
                    properties: {},
                    available:  true
                });

                for (let property in object.properties) {
                    this.properties[property].apply(object, object.properties[property], this);
                }

                for (let action in object.actions) {
                    if (Object.getOwnPropertyDescriptor(object.actions, action).get !== undefined) {
                        throw(`Object "${name}": do not use getters for actions. You can customize their behavior using an object instead`);
                    }
                }

                return object;
            });

            for (let action in this.actions) {
                if (Object.getOwnPropertyDescriptor(this.actions, action).get !== undefined) {
                    throw(`Do not use getters for actions. You can customize their behavior using an object instead`);
                }
            }

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
        }

        describeCurrentLocation () {
            // actions
            let actions = this.state.locked ? [] : this.currentLocation.actions;
            const globalActions = this.state.locked ? [] : this.actions;
            actions = Steller.utils.lightMerge(actions, globalActions);
            const outputActions = []
            for (let action in actions) {
                let ac = {
                    get command () { return action.toLowerCase() },
                    get name() { return action },
                    get text () { return actions[action] },
                    available: true
                };

                if (_.isObject(actions[action])) {
                    ac = Steller.utils.lightMerge(actions[action], ac);
                }

                if (!ac.available) continue;
                outputActions.push({
                    name: ac.name,
                    text: () => {
                        this.printCommand(ac.command);
                        this.print(ac.text);
                    }
                });
            }


            // exits
            const exits = this.state.locked ? [] : this.currentLocation.exits;
            const outputExits = [];
            for (let exit in exits) {
                let ex = {
                    get command () {return exit.toLowerCase(); },
                    get text () { return exits[exit] },
                    available: true
                };

                if (_.isObject(exits[exit])) {
                    if ('direction' in exits[exit]) {
                        Object.defineProperty(exits[exit], 'text', Object.getOwnPropertyDescriptor(exits[exit], 'direction'));
                    }
                    ex = Steller.utils.lightMerge(exits[exit], ex);
                }

                if (!ex.available) continue;
                outputExits.push({
                    name: exit,
                    text: () => {
                        this.gotoLocation(ex.text, ex.command);
                    }
                });
            }

            // objects
            const objects = this.objectsInLocation();
            const outputObjects = [];
            for (let object in objects) {
                if (!objects[object].available) continue;
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

                availableActions = _.pickBy(availableActions, a => a.available !== false);

                actions = _.map(availableActions, (action, actionName) => {
                    if (_.isString(action)) return {
                        name: actionName,
                        text: () => {
                            self.printCommand(actionName.toLowerCase());
                            self.print(action);
                        }
                    };

                    return {
                        name: actionName,
                        text: () => {
                            if ('beforeText' in action) action.beforeText();
                            self.printCommand(action.command || actionName.toLowerCase());
                            self.print(action.text);
                            if ('afterText' in action) action.afterText();
                            this.refreshState();
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
            if (_.trim(text) === '') {
                this.refreshState();
                return;
            }

            this.state.out = {
                texts: this.state.out.texts.concat([{
                    text: text,
                    type: type || 'normal'
                }])
            };
            this.refreshState();
        }

        printCommand (text) {
            if (_.trim(text) === '') {
                this.refreshState();
                return;
            }

            this.print(text, 'command');
            this.everyturn();
            this.refreshState();
        }

        printScore () {
            this.print(this.score, 'score');
        }

        gotoLocation (location, command) {
            if (command !== undefined) this.printCommand(command);

            if (location in this.locations) {
                if ('onExit' in this.currentLocation) this.currentLocation.onExit();
                this.currentLocation = location;
                if ('onEnter' in this.currentLocation) this.currentLocation.onEnter();
                this.refreshState();
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

        objectIsInLocation (objectName, locationName) {
            if (locationName === undefined) locationName = this._currentLocation;
            return this.objects[objectName].location === locationName;
        }

        characterIsInLocation (characterName, locationName) {
            return this.objectIsInLocation(characterName, locationName);
        }

        moveObjectToLocation (objectName, locationName) {
            if (locationName === undefined) locationName = this._currentLocation;
            const object = this.objects[objectName];

            object.location = locationName;
            this.refreshState();
        }

        moveCharacterToLocation (charactertName, locationName) {
            return this.moveObjectToLocation(charactertName, locationName);
        };

        moveObjectToInventory (objectName) {
            this.moveObjectToLocation(objectName, Steller.INVENTORY);
        }

        refreshState () {
            this.describeCurrentLocation();
            this.updateInventory();
        }

        resetAction () {
            this.state.action = {};
            this.refreshState();
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
            this.refreshState();
        }

        unlockInteraction () {
            this.state.locked = false;
            this.refreshState();
        }

        end () {
            this.state.end = true;
            this.lockInteraction();
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
            this.print(this.texts.RESTORED);
        }
    },

    utils: {
        lightMerge (obj, source) {
            for (let prop in source) {
                if (!(prop in obj)) {
                    Object.defineProperty(obj, prop, Object.getOwnPropertyDescriptor(source, prop));
                }
            }

            return obj;
        },

        formatText (str, ...rest) {
            for (let i = 0; i < rest.length; i++) {
                str = str.split(`{${i}}`).join(rest[i]);
            }
            return str;
        },

        guid (prefix='') {
            Steller.utils.uniqueId += 1;
            return prefix + (new Date().getTime() + Steller.utils.uniqueId);
        },

        uniqueId: 0
    },

    Lang: {
        en: {
            SAVE:     'save',
            RESTORE:  'restore',
            SAVED:    'Saved',
            RESTORED: 'Restored',
            EXAMINE:  'Examine',

            properties: {},
            ui: {}
        },
        it: {
            SAVE:     'salva',
            RESTORE:  'ricarica',
            SAVED:    'Salvato',
            RESTORED: 'Ricaricato',
            EXAMINE:  'Esamina',

            properties: {},

            ui: {}
        },
    },

    Properties: {},
    Formatters: {}
};

/* istanbul ignore next */
if (this.window === undefined) {
    module.exports = Steller;
}
