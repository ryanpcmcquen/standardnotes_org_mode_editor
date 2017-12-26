document.addEventListener("DOMContentLoaded", function(event) {
    const modes = [
        "org"
    ];

    let componentManagerInstance;
    let workingNote;
    let clientData;
    let lastValue;
    let lastUUID;
    let editor;
    let modeInput;
    let select;
    let defaultMode = "org";
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
            editor.setOption("mode", spec);
            //CodeMirror.autoLoadMode(editor, mode);
            
            if (clientData) {
                clientData.mode = mode;
            }
        } else {
            console.error("Could not find a mode corresponding to " + val);
        }
    };

    const onReceivedNote = (note) => {
        if (note.uuid !== lastUUID) {
            // Note changed, reset last values
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
        let permissions = [{ name: "stream-context-item" }];
        componentManagerInstance = new ComponentManager(permissions, function() {
            // on ready
        });

        componentManagerInstance.streamContextItem(note => {
            onReceivedNote(note);
        });
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
        editor = CodeMirror.fromTextArea(document.querySelector(".orgmode"), {
            lineNumbers: true,
            indentUnit: 4
        });
        editor.setSize("100%", "100%");

        setTimeout(function() {
            changeMode(defaultMode);
        }, 1);

        editor.on("change", function() {
            if (ignoreTextChange) {
                return;
            }
            save();
        });
    };

    loadEditor();
    loadComponentManager();

    window.setKeyMap = (keymap) => {
        editor.setOption("keyMap", keymap);
    };

});
