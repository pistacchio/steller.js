Steller.Lang.en.ui = {
    SAVE:      'Save',
    RESTORE:   'Restore',
    EXITS:     'Exits',
    YOU_SEE:   'You can also see',
    ACTIONS:   'Actions',
    SCORE_UP:  'Your score just went up to {0}!',
    SCORE:     'Score',
    INVENTORY: 'You carry'
};
Steller.Lang.it.ui = {
    SAVE:      'Salva',
    RESTORE:   'Ricarica',
    EXITS:     'Uscite',
    YOU_SEE:   'Vedi anche',
    ACTIONS:   'Azioni',
    SCORE_UP:  'Il tuo punteggio è appena saluto a {0}!',
    SCORE:     'Punteggio',
    INVENTORY: 'Hai'
};


Steller.Web = {
    Game: class extends Steller.Game {
        constructor (options, $container, immediateUpdate=false) {
            super(options);

            this.TIMEOUT = 50;

            $container.html(`
                <style>
                    .steller {
                        width:          100%;
                        height:         100%;
                        min-height:     100%;
                        overflow:       auto;
                        display:        flex;
                        flex-direction: column;
                        background:     #F6F6F6;
                    }
                    .steller ul {
                        margin:  0;
                        padding: 0 0 0 0.5em;
                    }
                    .steller ul li {
                        list-style-type: none;
                    }

                    .steller .header,
                    .steller .footer {
                        height:     2em;
                        background: #F6F6F6;
                        overflow:   auto;
                        padding:    0.3em;
                    }
                    .steller .header .title {
                        float: left;
                    }
                    .steller .header .score {
                        float: right;
                    }
                    .steller .main .exits li,
                    .steller .main .actions li,
                    .steller .action .actions li {
                        display: inline-block;
                    }
                    .steller .main a,
                    .steller .inventory a,
                    .steller .action .actions a {
                        text-decoration: none;
                        display:        inline-block;
                        margin:         0.1em 0.5em 0.1em 0.5em;
                        padding:        0.2em !important;
                        border:         1px solid #888;
                        border-radius:  0.2em;
                        vertical-align: middle;
                    }
                    .steller .main-container {
                        flex-grow:      1;
                        display:        flex;
                        flex-direction: row;
                    }
                    .steller .main-container .output {
                        width:      40%;
                        background: #EBEBEB;
                        overflow-y: scroll;
                        padding:    1em;
                    }
                    .steller .main-container .sidebar {
                        width:      60%;
                        background: #E5E5E5;
                        overflow-y: scroll;
                    }
                    .steller .main-container .sidebar > div {
                        display: block;
                        margin:  0;
                    }
                    .steller .main-container .sidebar > .action {
                        background: #DCDCDC;
                        padding:    1em;
                    }
                    .steller .main-container .sidebar > .action:empty {
                        display: none;
                    }
                    .steller .main-container .sidebar .main {
                        background: #D5D5D5;
                        padding:    1em;

                    }
                    .steller .main-container .sidebar .inventory {
                        background: #CECECE;
                        padding:    1em;
                        display:    none;
                    }
                    .steller .main-container .sidebar .inventory:empty {
                        // display: none;
                    }
                    .steller .footer a {
                        margin-right: 15px;
                    }
                    .steller .output .command {
                        margin-top: 1em;
                    }
                    .steller .main h3 {
                        margin: 0;
                    }

                    @media (max-width: 35em) {
                        .steller {
                            display: block;
                        }
                        .steller .main-container {
                            width: auto;
                            flex-direction: column;
                            display: block;
                        }
                        .steller .main-container .output {
                            width:  93vw;
                            height: 30vh;
                        }
                        .steller .main-container .sidebar {
                            width: 100%;
                        }
                        .steller .header,
                        .steller .footer {
                            padding: 0.5em;
                        }

                    }
                </style>

                <div class="steller">
                    <div class="header">
                        <div class="title"></div>
                        <div class="score"></div>
                    </div>
                    <div class="main-container">
                        <div class="output"></div>
                        <div class="sidebar">
                            <div class="action"></div>
                            <div class="main"></div>
                            <div class="inventory"></div>
                        </div>
                    </div>
                    <div class="footer"></div>
                </div>
            `);

            const $header    = $container.find('.header');
            const $output    = $container.find('.output');
            const $action    = $container.find('.action');
            const $main      = $container.find('.main');
            const $inventory = $container.find('.inventory');
            const $footer    = $container.find('.footer');

            const self = this;

            let _header =    {};
            let _footer =    {};
            let _main =      {};
            let _out =       {
                texts: []
            };
            let _action =    {};
            let _inventory = {};

            let actionUpdate = false;
            let mainUpdate = false;
            let inventoryUpdate = false;

            const footerSave = $(`<a href="#">${self.texts.ui.SAVE}</a>`).on('click', () => {
                localStorage.setItem('gamedata', this.save(true));
            });
            $footer.append(footerSave);
            const footerRestore = $(`<a href="#">${self.texts.ui.RESTORE}</a>`).on('click', () => {
                this.restore(localStorage.getItem('gamedata'));
            });
            $footer.append(footerRestore);

            Object.defineProperty(this.state, 'main', {
                get: () => _main,
                set: val => {
                    _main = val;
                    mainUpdate = true;
                    if (immediateUpdate) updateUi();
                }
            });

            Object.defineProperty(this.state, 'out', {
                get: () => _out,
                set: val => {
                    _out = val;

                    $output.html('');
                    for (let text of val.texts) {
                        // console.log(text.type);
                        if (text.type in this.formatters) {
                            $output.append(Steller.utils.formatText(this.formatters[text.type], text.text));
                        } else {
                            switch(text.type) {
                                case 'command':
                                    $output.append(`<div class="command">> ${text.text}</div>`)
                                    break;
                                case 'score':
                                    $output.append(`<div class="score">${Steller.utils.formatText(self.texts.ui.SCORE_UP, text.text)}</div>`)
                                    break;
                                default:
                                    $output.append(`<div>${text.text}</div>`)
                                    break;
                            }
                        }
                    }

                    $output.stop().animate({scrollTop: $output.get(0).scrollHeight}, 300);
                }
            });

            Object.defineProperty(this.state, 'inventory', {
                get: () => _out,
                set: val => {
                    _inventory = val;
                    inventoryUpdate = true;
                    if (immediateUpdate) updateUi();
                }
            });

            Object.defineProperty(this.state, 'header', {
                get: () => _header,
                set: val => {
                    _header = val;
                    $header.find('.title').html(`<strong>${val.title}</strong>`);
                    if (val.score !== null) {
                        $header.find('.score').html(`<strong>${self.texts.ui.SCORE}: ${val.score}</strong>`);
                    }
                }
            });

            Object.defineProperty(this.state, 'action', {
                get: () => _header,
                set: val => {
                    _action = val;
                    actionUpdate = true;
                    if (immediateUpdate) updateUi();
                }
            });

            function updateUi () {
                if (mainUpdate) {
                    mainUpdate = false;

                    let oldHeight = $main.height();
                    $main.html(`
                        <h2 class="name">${_main.name}</h2>
                        <p>${_main.description}</p>
                    `);

                    if (_main.exits.length > 0) {
                        $main.append(`
                            <h3 class="section-header">${self.texts.ui.EXITS}:</h3>
                            <ul class="exits"></ul>`
                        );

                        for (let exit of _main.exits) {
                            const $anchor = $(`<li><a href="#">${exit.name}</a></li>`).on('click', exit.text);
                            $main.find('.exits').append($anchor);
                        }
                    }

                    if (_main.objects.length > 0) {
                        $main.append(`
                            <h3 class="section-header">${self.texts.ui.YOU_SEE}:</h3>
                            <ul class="objects"></ul>
                        `);

                        self.addObjects(_main.objects, $main.find('.objects'));
                    }

                    if (_main.actions.length > 0) {
                        $main.append(`
                            <h3 class="section-header">${self.texts.ui.ACTIONS}:</h3>
                            <ul class="actions"></ul>
                        `);

                        for (let action of _main.actions) {
                            const $anchor = $(`<li><a href="#">${action.name}</a></li>`).on('click', action.text);
                            $main.find('.actions').append($anchor);
                        }
                    }

                    let newHeight = $main.height();
                    $main.height(oldHeight);
                    $main.stop().animate({height: newHeight}, 300, () => {
                        $main.height('auto');
                    });
                }

                if (actionUpdate) {
                    actionUpdate = false;

                    if (_.isEmpty(_action)) {
                        $action.stop().slideUp(300, () => {
                            $action.html('');
                        });
                    } else {
                        let oldHeight = $action.height();
                        $action.html('');
                        if (_action.title) {
                            $action.append(`<h2>${_action.title}</h2>`);
                        }

                        if (_action.actions) {
                            $action.append(`
                                <ul class="actions"></ul>
                            `);

                            for (let action of _action.actions) {
                                const $anchor = $(`<li><a href="#">${action.name}</a></li>`).on('click', action.text);
                                $action.find('.actions').append($anchor);
                            }
                        }

                        let newHeight = $action.height();
                        $action.height(oldHeight);
                        $action.stop().show().animate({height: newHeight}, 300, () => {
                            $action.height('auto');
                        });
                    }
                }

                if (inventoryUpdate) {
                    inventoryUpdate = false;

                    if (_.isEmpty(_inventory.objects)) {
                        $inventory.stop().slideUp(300, () => {
                            $inventory.html('');
                        });
                    } else {
                        let oldHeight = $inventory.height();
                        $inventory.html('');
                        if (_inventory.objects.length > 0) {
                            $inventory.append(`
                                <h2>${self.texts.ui.INVENTORY}:</h2>
                                <ul class="objects"></ul>
                            `);

                            self.addObjects(_inventory.objects, $inventory.find('.objects'));
                        }

                        let newHeight = $inventory.height();
                        $inventory.height(oldHeight);
                        $inventory.stop().show().animate({height: newHeight}, 300, () => {
                            $inventory.height('auto');
                        });
                    }
                }

            }
            setInterval(updateUi, this.TIMEOUT);

        }

        addObjects (objects, $parent) {
            for (let object of objects) {
                const $object = $(`<li>${object.name}</li>`);

                for (let action of object.actions) {
                    const $anchor = $(`<a class="action" href="#">${action.name}</a>`).on('click', action.text);
                    $object.append($anchor);
                }

                $parent.append($object);
            }
        }
    }
};
