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

            this.properties = Steller.utils.lightMerge(Steller.Properties, this.properties);

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

        formatText (str, ...rest) {
            for (let i = 0; i < rest.length; i++) {
                str = str.split(`{${i}}`).join(rest[i]);
            }
            return str;
        }
    },

    Lang: {
        en: {
            SAVE:     'save',
            RESTORE:  'restore',
            SAVED:    'Saved',
            RESTORED: 'Restored',

            properties: {},
            ui: {}
        },
        it: {
            SAVE:     'salva',
            RESTORE:  'ricarica',
            SAVED:    'Salvato',
            RESTORED: 'Ricaricato',

            properties: {},

            ui: {}
        },
    },

    Properties: {}
};

/* istanbul ignore next */
if (this.window === undefined) {
    module.exports = Steller;
}
