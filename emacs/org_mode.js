document.addEventListener("DOMContentLoaded", (event) => {
    "use strict";

    let componentManagerInstance;
    let workingNote;
    let clientData;
    let lastValue;
    let lastUUID;
    let editor;
    let ignoreTextChange = false;
    let initialLoad = true;

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
        let permissions = [{ name: "stream-context-item" }];
        componentManagerInstance = new ComponentManager(permissions, () => {
            // Ready, go!
            const platform = componentManagerInstance.platform;
            if (platform) {
                document.body.classList.add(platform);
            }
        });

        componentManagerInstance.streamContextItem((note) => {
            onReceivedNote(note);
        });
    };

    const save = () => {
        if (workingNote) {
            // Be sure to capture this object as a variable, as this.note may be reassigned in `streamContextItem`, so by the time
            // you modify it in the presave block, it may not be the same object anymore, so the presave values will not be
            // applied to the right object, and it will save incorrectly.
            let note = workingNote;

            componentManagerInstance.saveItemWithPresave(note, () => {
                lastValue = editor.getValue();
                note.content.text = lastValue;
                note.clientData = clientData;

                note.content.preview_plain = null;
                note.content.preview_html = null;
            });
        }
    };

    const loadEditor = () => {
        editor = CodeMirror.fromTextArea(document.querySelector(".orgmode"), {
            autofocus: true,
            foldGutter: {
                minFoldSize: 1,
            },
            foldOptions: {
                widget: " ...",
            },
            gutters: ["CodeMirror-foldgutter"],
            indentUnit: 4,
            keyMap: "emacs",
            lineNumbers: false,
            lineWrapping: true,
            mode: "orgmode",
        });
        editor.setSize("100%", "100%");

        // Initialize with everything folded, like how Emacs does it:
        editor.execCommand('unfoldAll');
        editor.execCommand('foldAll');

        let wait;
        let changing = false;

        editor.on("change", (cm, change) => {
            if (ignoreTextChange) {
                return;
            }
            clearTimeout(wait);
            wait = setTimeout(() => {
                changing = true;
                cm.wrapParagraphsInRange(
                    change.from,
                    CodeMirror.changeEnd(change)
                );
                changing = false;
            }, 200);
            save();
        });
    };

    loadEditor();
    loadComponentManager();

    // Crazy dark mode detector.
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
    const themeFilters = {
        light: "",
        dark: "invert(1) hue-rotate(180deg)",
    };
    const themeChooser = document.querySelector(".theme-chooser");
    themeChooser.addEventListener("click", (event) => {
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
    });

    // Load saved theme filters from local storage:
    const result = window.localStorage.getItem("orgModePreferences");
    if (result) {
        const orgModePreferences = JSON.parse(result);
        const defaultTheme = orgModePreferences
            ? orgModePreferences.themeFilter
            : "light";
        document.querySelector(`[value=${defaultTheme}]`).click();
    }
});
