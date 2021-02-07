interface Date {
	/**
     * turns timestamp to ISO like "20210119-182416" format
     */
	formatAsDateTimeCompact(): string;
}

interface Number {
    /**
     * turns 2^10 to "KB", 2^20 to "MB" and so on
     */
    getUnit(): Array<string, number>;
    /**
     * turns 2^10 to "1.0 KB", 2^20 to "1.0 MB" and so on
     * @param unit custom unit
     * @param decimal how many decimals
     */
    formatAsSize(unit?: Array<string, number>, decimal?: number): string;
	/**
     * turns milliseconds to rounded seconds
     */
	formatAsDuration(): string;
	/**
     * converts timestamps to time format
     */
    formatAsHms(): string;
	/**
     * turns timestamp to ISO "2021-01-19T18:24:16.123Z" format
     */
    formatAsDateISO(): string;
	/**
     * turns timestamp to ISO like "20210119-182416" format
     */
	formatAsDateTimeCompact(): string;
	/**
     * turns timestamp to DOpus "D2021-01-19 T18:24:16" format
     */
	formatAsDateDOpus(): string;
}

interface String {
    /**
     * makes sure that the paths always have a trailing backslash but no doubles
     * this happens mainly because the oItem.path does not return a trailing slash for any directory
     * other than root dir of a drive, i.e. it returns Y:\Subdir (no BS) but Y:\ (with BS)
     */
    normalizeTrailingBackslashes(): string;

    /**
     * substitutes variables - Only Global ones - in the given string
     * e.g.
     * my name is: ${Global.SCRIPT_NAME}
     */
    substituteVars(): string;
}





interface DOpusFactory {
     Blob()           : function;
     BusyIndicator()  : function;
     Command()        : function;
     Date()           : function;
     Map()            : function;
     StringSet()      : function;
     StringSetI()     : function;
     StringTools()    : function;
     UnorderedSet()   : function;
     Vector()         : function;

}
interface DOpus {}
/*
ClearOutput      ; none                                                               ; none                     ; Clears the script output log.
Create           ; none                                                               ; object:DOpusFactory      ; Creates and returns a new DOpusFactory object, which can be used to create various lightweight helper objects like Blob, Map and Vector.
Delay            ; <int:time>                                                         ; none                     ; Delays for the specified number of milliseconds before returning.
Dlg              ; none                                                               ; object:Dialog            ; Creates a new Dialog object, that lets you display dialogs and popup menus.
DPI              ; none                                                               ; object:DPI               ; Creates the DPI helper object which assists when dealing with different system scaling settings (e.g. high-DPI monitors).
FSUtil           ; none                                                               ; object:FSUtil            ; Creates a new FSUtil object, that provides helper methods for accessing the file system.
GetClip          ; none|<string:type>                                                 ; string|collection:Item   ; Retrieves the current contents of the system clipboard, if it contains either text or files.
GetClipFormat    ; none                                                               ; string                   ; Returns a string indicating the native format of the clipboard contents - "text", "files" or an empty string in any other case.
GetQualifiers    ; none                                                               ; string                   ; Returns a string indicating which qualifier keys are currently held down. If none are held down, the string will be "none". Otherwise, the string can contain any or all of the following, separated by commas: "shift", "ctrl", "alt", "lwin", "rwin".
LoadImage        ; <string:filename>, [<int:width>], [<int:height>], [<bool:alpha>]   ; object:Image             ; Loads an image file from the specified external file. You can optionally specify the desired size to load the image at, and whether the alpha channel (if any) should be loaded or not.
LoadThumbnail    ; <string:filename>, [<int:timeout>], [<int:width>], [<int:height>]  ; object:Image|False       ; Extracts a thumbnail from the specified external file. You can optionally specify a timeout (in milliseconds) and the desired size to load the thumbnail at.
Output           ; <string:text>, [<bool:error>], [<bool:timestamp>]                  ; none                     ; Prints the specified text string to the script output log (found in the Utility Panel,  the CLI in script mode, the Rename dialog and the Command Editor in script mode).
ReloadScript     ; <string:file>                                                      ; none                     ; Causes Opus to reload and reinitialize the specified script. You must provide the full pathname of the script on disk (if a script add-in wants to reload itself you can pass the value of the Script.file property).
SetClip          ; <string:text>|collection:Item|none                                 ; none                     ; Places the specified text, or Item collection (or Vector of Item objects) on the system clipboard. If called with no arguments the clipboard will be cleared.
Toolbars         ; <string:type>                                                      ; object:Toolbars          ; Returns a Toolbars object which lets you enumerate all defined toolbars (whether they are currently open or not).
TypeOf           ; any                                                                ; string                   ; Returns a string indicating the type of an object or variable.
*/
interface DOpusConstructor {
     Output: function;
     ClearOutput: function;
     Dlg: function;
     Delay: function;
     FSUtil: object;
     Create: DOpusFactory;
}
declare var DOpusX: DOpusConstructor;



interface Script {}
interface ScriptConstructor {
     Vars: object;
}
declare var ScriptX: ScriptConstructor;
