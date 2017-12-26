document.addEventListener("DOMContentLoaded", function(event) {
    var modes = [
        "org"
    ];

    var componentManager;
    var workingNote, clientData;
    var lastValue, lastUUID;
    var editor, modeInput, select;
    var defaultMode = "javascript";
    var ignoreTextChange = false;
    var initialLoad = true;

    function loadComponentManager() {
        var permissions = [{ name: "stream-context-item" }];
        componentManager = new ComponentManager(permissions, function() {
            // on ready
        });

        componentManager.streamContextItem(note => {
            onReceivedNote(note);
        });
    }

    function save() {
        if (workingNote) {
            lastValue = editor.getValue();
            workingNote.content.text = lastValue;
            workingNote.clientData = clientData;
            componentManager.saveItem(workingNote);
        }
    }

    function onReceivedNote(note) {
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
    }

    function loadEditor() {
        editor = CodeMirror.fromTextArea(document.getElementById("code"), {
            lineNumbers: true
        });
        editor.setSize("100%", "100%");

        setTimeout(function() {
            changeMode(defaultMode);
        }, 1);

        createSelectElements();

        editor.on("change", function() {
            if (ignoreTextChange) {
                return;
            }
            save();
        });
    }

    function createSelectElements() {
        select = document.getElementById("select");
        var index = 0;
        for (var element in modes) {
            var opt = document.createElement("option");
            opt.value = index;
            opt.innerHTML = modes[index];
            select.appendChild(opt);
            index++;
        }
    }

    loadEditor();
    loadComponentManager();

    /*
    Editor Modes
  */

    window.setKeyMap = function(keymap) {
        editor.setOption("keyMap", keymap);
    };

    window.onLanguageSelect = function(event) {
        var language = modes[select.selectedIndex];
        changeMode(language);
        save();
    };

    function changeMode(inputMode) {
        var val = inputMode,
            m,
            mode,
            spec;
        if ((m = /.+\.([^.]+)$/.exec(val))) {
            var info = CodeMirror.findModeByExtension(m[1]);
            if (info) {
                mode = info.mode;
                spec = info.mime;
            }
        } else if (/\//.test(val)) {
            var info = CodeMirror.findModeByMIME(val);
            if (info) {
                mode = info.mode;
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
            document.getElementById("select").selectedIndex = modes.indexOf(
                mode
            );
        } else {
            console.error("Could not find a mode corresponding to " + val);
        }
    }
});
