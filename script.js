document.addEventListener('DOMContentLoaded', (event) => {
    'use strict';

    let componentManagerInstance;
    let workingNote;
    let clientData;
    let lastValue;
    let lastUUID;
    let editor;
    let modeInput;
    let select;
    let ignoreTextChange = false;
    let initialLoad = true;

    const changeMode = (inputMode) => {
        let val = inputMode;
        let m;
        let mode;
        let spec;
        if ((m = /.+\.([^.]+)$/.exec(val))) {
            let info = CodeMirror.findModeByExtension(m[1]);
            if (info) {
                mode = info.mode;
                spec = info.mime;
            }
        } else if (/\//.test(val)) {
            let info = CodeMirror.findModeByMIME(val);
            if (info) {
                mode = info.mode;
                spec = val;
            }
        } else {
            mode = spec = val;
        }

        if (mode) {
            editor.setOption('mode', spec);
            CodeMirror.autoLoadMode(editor, mode);

            if (clientData) {
                clientData.mode = mode;
            }
        } else {
            console.error(`Could not find a mode corresponding to: ${val}`);
        }
    };

    const onReceivedNote = (note) => {
        if (note.uuid !== lastUUID) {
            // Note has changed, reset last values:
            lastValue = null;
            initialLoad = true;
            lastUUID = note.uuid;
        }

        workingNote = note;
        // Only update UI on non-metadata updates.
        if (note.isMetadataUpdate) {
            return;
        }
        clientData = note.clientData;

        let mode = clientData.mode;
        if (mode) {
            changeMode(mode);
        }

        if (editor) {
            if (note.content.text !== lastValue) {
                ignoreTextChange = true;
                editor.getDoc().setValue(workingNote.content.text);
                ignoreTextChange = false;
            }

            if (initialLoad) {
                initialLoad = false;
                editor.getDoc().clearHistory();
            }
        }
    };

    const loadComponentManager = () => {
        let permissions = [
            { name: 'stream-context-item' },
            { name: 'stream-items' }
        ];
        componentManagerInstance = new ComponentManager(permissions, () => {});

        componentManagerInstance.streamContextItem((note) => {
            onReceivedNote(note);
        });

        // Assume light mode, but try to detect dark modes.
        try {
            componentManagerInstance.activeThemes.forEach((activeTheme) => {
                fetch(activeTheme)
                    .then((res) => {
                        if (res.ok) {
                            return res.text();
                        }
                    })
                    .then((css) => {
                        const backgroundMatches = css.match(
                            /--sn-stylekit-background-color:.*/
                        );

                        if (backgroundMatches.length > 0) {
                            let isLightMode =
                                backgroundMatches[0]
                                    .replace(
                                        '--sn-stylekit-background-color:',
                                        ''
                                    )
                                    .match(/\d/g).length > 3;

                            if (isLightMode) {
                                editor.getWrapperElement().style.filter = '';
                            } else {
                                editor.getWrapperElement().style.filter =
                                    'invert(1) hue-rotate(180deg)';
                            }
                        }
                    })
                    .catch(() => {});
            });
        } catch (ignore) {}
    };

    const save = () => {
        if (workingNote) {
            lastValue = editor.getValue();
            workingNote.content.text = lastValue;
            workingNote.clientData = clientData;
            componentManagerInstance.saveItem(workingNote);
        }
    };

    const loadEditor = () => {
        editor = CodeMirror.fromTextArea(document.querySelector('.orgmode'), {
            autofocus: true,
            foldGutter: {
                minFoldSize: 1
            },
            foldOptions: {
                widget: '...'
            },
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            indentUnit: 4,
            // keyMap: "emacs",
            lineNumbers: false,
            lineWrapping: true,
            mode: 'orgmode'
        });
        editor.setSize('100%', '100%');

        editor.on('change', () => {
            if (ignoreTextChange) {
                return;
            }
            save();
        });
    };

    loadEditor();
    loadComponentManager();
});
