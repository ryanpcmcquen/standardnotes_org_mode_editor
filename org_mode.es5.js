"use strict";

document.addEventListener("DOMContentLoaded", function (event) {
    "use strict";

    var componentManagerInstance;
    var workingNote;
    var clientData;
    var lastValue;
    var lastUUID;
    var editor;
    var modeInput;
    var select;
    var ignoreTextChange = false;
    var initialLoad = true;

    var changeMode = function changeMode(inputMode) {
        var val = inputMode;
        var m;
        var mode;
        var spec;

        if ((m = /.+\.([^.]+)$/.exec(val))) {
            var info = CodeMirror.findModeByExtension(m[1]);

            if (info) {
                mode = info.mode;
                spec = info.mime;
            }
        } else if (/\//.test(val)) {
            var _info = CodeMirror.findModeByMIME(val);

            if (_info) {
                mode = _info.mode;
                spec = val;
            }
        } else {
            mode = spec = val;
        }

        if (mode) {
            editor.setOption("mode", spec);
            CodeMirror.autoLoadMode(editor, mode);

            if (clientData) {
                clientData.mode = mode;
            }
        } else {
            console.error(
                "Could not find a mode corresponding to: ".concat(val)
            );
        }
    };

    var onReceivedNote = function onReceivedNote(note) {
        if (note.uuid !== lastUUID) {
            // Note has changed, reset last values:
            lastValue = null;
            initialLoad = true;
            lastUUID = note.uuid;
        }

        workingNote = note; // Only update UI on non-metadata updates.

        if (note.isMetadataUpdate) {
            return;
        }

        clientData = note.clientData;
        var mode = clientData.mode;

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

    var loadComponentManager = function loadComponentManager() {
        var permissions = [
            {
                name: "stream-context-item",
            },
        ];
        componentManagerInstance = new ComponentManager(
            permissions,
            function () {
                // Ready, go!
                var platform = componentManagerInstance.platform;

                if (platform) {
                    document.body.classList.add(platform);
                }
            }
        );
        componentManagerInstance.streamContextItem(function (note) {
            onReceivedNote(note);
        });
    };

    var save = function save() {
        if (workingNote) {
            // Be sure to capture this object as a variable, as this.note may be reassigned in `streamContextItem`, so by the time
            // you modify it in the presave block, it may not be the same object anymore, so the presave values will not be
            // applied to the right object, and it will save incorrectly.
            var note = workingNote;
            componentManagerInstance.saveItemWithPresave(note, function () {
                lastValue = editor.getValue();
                note.content.text = lastValue;
                note.clientData = clientData;
                note.content.preview_plain = null;
                note.content.preview_html = null;
            });
        }
    };

    var loadEditor = function loadEditor() {
        editor = CodeMirror.fromTextArea(document.querySelector(".orgmode"), {
            autofocus: true,
            foldGutter: {
                minFoldSize: 1,
            },
            foldOptions: {
                widget: "...",
            },
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            indentUnit: 4,
            // keyMap: "emacs",
            lineNumbers: false,
            lineWrapping: true,
            mode: "orgmode",
        });
        editor.setSize("100%", "100%");
        editor.on("change", function () {
            if (ignoreTextChange) {
                return;
            }

            save();
        });
    };

    loadEditor();
    loadComponentManager(); // Crazy dark mode detector.
    // try {
    //     const dataFromRoot = document.querySelector('.__data_from_root__');
    //     if (dataFromRoot) {
    //         let isDarkMode =
    //             JSON.parse(
    //                 getComputedStyle(dataFromRoot)
    //                     .color.replace(/^rgb\(/, '[')
    //                     .replace(/\)$/, ']')
    //             ).filter((color) => {
    //                 return (color < 150);
    //             }).length > 1;
    //         if (isDarkMode) {
    //             editor.getWrapperElement().style.filter =
    //                 'invert(1) hue-rotate(180deg)';
    //         } else {
    //             editor.getWrapperElement().style.filter = '';
    //         }
    //     }
    // } catch (err) {
    //     console.warn('Dark mode detection failed: ', err);
    // }
    // Change themes:

    var themeFilters = {
        light: "",
        dark: "invert(1) hue-rotate(180deg)",
    };
    var themeChooser = document.querySelector(".theme-chooser");
    themeChooser.addEventListener("click", function (event) {
        if (/INPUT/.test(event.target.tagName)) {
            editor.getWrapperElement().style.filter =
                themeFilters[event.target.value];
            window.localStorage.setItem(
                "orgModePreferences",
                JSON.stringify({
                    themeFilter: event.target.value,
                })
            );
        }
    }); // Load saved theme filters from local storage:

    var result = window.localStorage.getItem("orgModePreferences");

    if (result) {
        var orgModePreferences = JSON.parse(result);
        var defaultTheme = orgModePreferences
            ? orgModePreferences.themeFilter
            : "light";
        document.querySelector("[value=".concat(defaultTheme, "]")).click();
    }
});
