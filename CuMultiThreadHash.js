// @ts-nocheck
/*
	 .d8888b.  888       .d88888b.  888888b.          d8888 888
	d88P  Y88b 888      d88P" "Y88b 888  "88b        d88888 888
	888    888 888      888     888 888  .88P       d88P888 888
	888        888      888     888 8888888K.      d88P 888 888
	888  88888 888      888     888 888  "Y88b    d88P  888 888
	888    888 888      888     888 888    888   d88P   888 888
	Y88b  d88P 888      Y88b. .d88P 888   d88P  d8888888888 888
	 "Y8888P88 88888888  "Y88888P"  8888888P"  d88P     888 88888888
*/
{
	{
		// the gigantic ASCII figlets are just for VSCode minimap :) - by https://textart.io/figlet

		/**
		 *
		 * Why ADS? Why not classical checksum files?
		 *
		 * When you create hash checksum files of large folders with typical programs
		 * these files contain all the files, just as you requested, and their hashes.
		 * These files act as a snapshot.
		 *
		 * If you are not planning to make any changes in this folder, everything's fine,
		 * you can use the checksum file over and over.
		 * You can still use this script, as it includes full support for external checksum files and more, too.
		 *
		 * However, if or when you add or remove files from these folders, these files slowly
		 * become obsolete and deviate from the checksum you have created.
		 * If you use the old checksum file over and over, you will get increasing number of errors.
		 * If you create a new checksum file after each change in the folder,
		 * you will lose track of which files might have been corrupted.
		 *
		 * If you use ADS, however, you can attach the hash checksum to each file; the overhead is incredibly small.
		 * Now you can quickly identify changed files and still validate the rest, unchanged files,
		 * since each hash is directly attached to the file, instead of in static snapshots.
		 * And you can select and verify any number of files, you do not need a checksum file containing each of these files.
		 *
		 * Another benefit is, the file's last modification timestamp & last known size is stored in ADS.
		 * This helps to quickly identify changed files, since you have last updated the ADS hashes
		 * WITHOUT re-checking every single file, simply activate one of 'Dirty' or 'Dirty Verbose' columns and you will see.
		 * If the file size or date changes, it is almost impossible that the hash will not change,
		 * so these files can be quickly identified in isolation, incl. what is changed: date, size or both.
		 * If you export ADS hashes, the script will warn you automatically that some files have no or outdates hashes.
		 * It also means, if somebody maliciously changes a file keeping its size and modification date exactly as before,
		 * it will not be identified as Dirty, but this flag is just a helper and you can always validate the files.
		 *
		 * You can also import existing .shaXXX, .md5 or this script's own .json format checksum files
		 * into ADS and remove the dependency to external files. The imported checksums will not be verified during import,
		 * but the script will ask you to verify all files which could be matched from the imported file.
		 *
		 * Yet another benefit is, apart from the extraordinarily fast multi-threading (fast af, if I may say so; second to CHK),
		 * if you are often synchronizing large amounts of files between computers,
		 * you can easily export the existing ADS data without re-calculation, and easily verify on the other computer,
		 * with this script or any other typical checksum programs, .md5 and .sha1 formats are fully supported.
		 *
		 * Although currently only 1 single algorithm at a time is supported in the script (I see no benefit in using multiple),
		 * the ADS streams for multiple streams are completely independent of each other,
		 * i.e. SHA1 hashes are stored in a different stream than SHA256, MD5, etc. hashes.
		 * Use whichever algorithm suits your needs best.
		 *
		 * Once you get used to the integration of extremely fast hashing and an excellent file manager,
		 * you will not miss classical hashing programs ;)
		 *
		 *
		 * NOTES:
		 * - Generated files are UTF8 without BOM by default
		 *   If you use DOpus text viewer plugin, activate 'Assume UTF-8 without BOM' in its settings to view non-ASCII chars correctly
		 * - Activating the DOpus option 'File Operations -> Copy Attributes -> Copy all NTFS data streams' is highly recommended.
		 * - If you are using WinRAR you can activate 'Advanced -> Save file streams' in archiving dialog
		 *   and save it in your default profile as well. This will carry ADS hashes around.
		 *   Unfortunately 7-Zip or DOpus created archives do NOT support this.
		 *
		 *
		 * ADS OVERHEAD:
		 * For SHA1 hashes the amount of data is typically around 150-160 bytes.
		 * This information is NOT allocated in a separate cluster than the main file's own,
		 * i.e. if your cluster size is 4096 bytes, a 1 byte file plus 160 bytes ADS will still allocate only 4096 bytes, not 8192.
		 *
		 *
		 *
		 *
		 * DESIGN PRINCIPLES OF THIS SCRIPT
		 *
		 * - Wherever relevant, file size is preferred over file count
		 * - Original files are never ever touched, not even by mistake, only its ADS streams
		 * - Tries to replace existing hashing programs, by integrating the functionality into a full-fledged file manager
		 *   but it can easily be extended with external apps to utilize non-DOpus hashing algorithms, too
		 * - Speed! Speed! Speed! Tries to maximize of CPU usage if possible, not to let it sit idly
		 * - Prefers NTFS ADS over external filelists with hashes, because such files become easily outdated
		 *   but external checksum files are fully supported as well, without using any ADS at all if you like
		 *
		 *
		 * When you look at the code, you will see some non-typical, i.e. not state-of-the-art JavaScript.
		 * This has 2 reasons:
		 * 1. I'm an ok but not the most seasoned JS programmer
		 * 2. This not ES5 or newer, but JScript!
		 * 3. This is not a browser environment and due to only available method to us for multi-threading,
		 *    i.e. fire-and-forget, we cannot pass callback functions, etc. and must communicate via
		 *    DOpus variables only.
		 *
		 *
		 * PLANNED FEATURES
		 *
		 * all info is stored in/checked against ADS
		 * each algorithm will use its own separate stream to simplify implementation and usage
		 *
		 * - Checkmark / Verify hashes: calculate anew and check against ADS value if exists
		 * - Sync / smart update: update ADS if files are changed (date or size), skip if not
		 * - Pending / find dirty: check ADS modified date & size against current file modified date & size
		 * - Looking Glass / find missing: call hash exists for all selected files
		 *
		 * Very clear:
		 *
		 * - NO ICON! - Query / hash exists: (Internal method/Column) simply check if ADS for selected hash for selected file exists
		 * - NO ICON! - Dirty / ADS differs: (Internal method/Column) check ADS modified date & size against current file modified date & size
		 *
		 * - Attach / create hashes: hard-update ADS, ignore any existing ADS
		 * - Trash / delete hashes: delete all existing ADS
		 * - Clipboard / copy hashes: copy existing hashes of selected files into clipboard; option to check if dirty/updated files exist
		 * - Export/Download / create hash file: create output file from existing hashes of selected files; option to check if dirty/updated files exist
		 * - Import/Upload / import hash file: select an external file and write directly to ADS of corresponding files
		 * - Text Snippet / use external file: use hashes in external file and compare existing ADS if not dirty, or calculate new if dirty
		 *
		 *
		 * how to enumerate NTFS streams?
		 *
		 * from https://microsoft.public.scripting.vbscript.narkive.com/xGdxzTQu/using-user32-dll-function-from-vbscript-wsh
		 * DO NOT RUN THIS!!!!!!
		 * 		WshShell.Run "%windir%\System32\RUNDLL32.EXE USER32.DLL,UpdatePerUserSystemParameters", 1, False
		 */


		function __GLOBAL__(){}
		// do not change
		var GlobalScope = this;
		GlobalScope.id = '5';

		var Global = {};
		Global.SCRIPT_NAME        = 'CuMultiThreadHash'; // WARNING: if you change this after initial use you have to reconfigure your columns, infotips, rename scripts...
		Global.SCRIPT_NAME_SHORT  = 'MTH'; // WARNING: if you change this after initial use you have to rename all methods!
		Global.SCRIPT_VERSION     = '0.9';
		Global.SCRIPT_COPYRIGHT   = '© 2021 cuneytyilmaz.com'
		Global.SCRIPT_URL         = 'https://github.com/cy-gh/DOpus_CuMultiThreadHash/';
		Global.SCRIPT_DESC        = 'Multi-Threaded hashing of selected files ';
		Global.SCRIPT_MIN_VERSION = '12.0';
		Global.SCRIPT_DATE        = '20210115';
		Global.SCRIPT_GROUP       = 'cuneytyilmaz.com';
		Global.SCRIPT_PREFIX      = Global.SCRIPT_NAME_SHORT; // prefix for field checks, log outputs, progress windows, etc. - do not touch
		Global.SCRIPT_LICENSE     = 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)';


		var util = {};
		util.cmd     = DOpus.Create.Command;
		util.st      = DOpus.Create.StringTools;
		util.sv      = Script.vars;
		util.shell   = new ActiveXObject('WScript.shell');
		util.dopusrt = 'dopusrt /acmd';
		util.fu      = DOpus.FSUtil;



		var sleepdur = 1; // in millisecs, used as wait between checking available # of threads & still running threads checks

		var STREAM_PREFIX = 'MTHash_';

		// TRUE is highly recommended
		var CACHE_ENABLED = true;

		// currently there will be only 1 algorithm: SHA1.
		// DOpus' internal "sha256" & "sha512" seem to have a bug and both calculate wrong results
		// that leaves: "md5", "sha1", "crc32", "crc32_php", and "crc32_php_rev"
		// and I decided to go with SHA1 as a compromise  *temporarily*  because it's reasonably fast & secure
		// between fast and insecure MD5 and slow and secure SHA256/SHA512 (currently insecure for files >=512 MB in DOpus' case!)
		// https://resource.dopus.com/t/column-sha-256-and-sha-512/33525/6
		//
		// before you start "but SHA1 is broken..."
		// No, it is not broken, at least not for any practical purpose or for purposes of this script
		// yes, SHA1 is known to have collisions but that requires malicious & very time-consuming preparation of tampered data
		// which is never ever the case for files on your disk and even 1 bit corruption in a file will result in a different hash
		// even if you use MD5!
		// the goal here is to quickly verify file integrity of your own files
		// not build military grade infrastructure or use these algorithms for web site security, etc.
		// if you are concerned that the files under your control might be tampered with by external agents
		// and could have the same hash checksum as previously, then this script is not what you're looking for
		// but as soon as DOpus fixes the bug mentioned above, you can anyway switch to SHA-256/512 if you like
		//
		// you can read more about it here:
		// https://security.stackexchange.com/a/87377
		var DEFAULT_ALGORITHM = 'sha1';
		var CURRENT_ALGORITHM = DEFAULT_ALGORITHM;

		// false usually increases the speed up to 25% for mixed groups of files
		// but makes little difference if file sizes are close to each other (usually few big files)
		var PROCESS_BIGGEST_FILES_FIRST = false;

		// makes very little, < 3%, difference to overall performance
		var USE_PROGRESS_BAR = true;

		// avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack because of other overly large files
		var AVOID_OVERFILLED_KNAPSACKS = true;

		// %NUMBER_OF_PROCESSORS% gives the logical number of processors, i.e. hyperthreaded ones
		// for physical core count use:
		// > WMIC CPU Get DeviceID,NumberOfCores,NumberOfLogicalProcessors
		// DeviceID  NumberOfCores  NumberOfLogicalProcessors
		// CPU0      12             24
		var MAX_AVAILABLE_CORE_COUNT = util.shell.ExpandEnvironmentStrings("%NUMBER_OF_PROCESSORS%");

		// this must be NOT the function name but the COMMAND name!
		// we will start it via 'dopusrt /acmd <WORKER_COMMAND>...' to start the threads
		var WORKER_COMMAND = 'MTHWorker';

		// used by ReadFile() & SaveFile()
		var TEXT_ENCODING = { 'utf8': 1, 'utf16': 2 };

		// collection names for find commands & files which reported an error
		var COLLECTION_FOR_DIRTY         = Global.SCRIPT_NAME_SHORT + ' - ' + 'Outdated hashes';
		var COLLECTION_FOR_MISSING       = Global.SCRIPT_NAME_SHORT + ' - ' + 'Missing hashes';
		var COLLECTION_FOR_ERRORS        = Global.SCRIPT_NAME_SHORT + ' - ' + 'Files with errors';
		var COLLECTION_FOR_IMPORT_ERRORS = Global.SCRIPT_NAME_SHORT + ' - ' + 'Import errors';
		var COLLECTION_FOR_VERIFY_ERRORS = Global.SCRIPT_NAME_SHORT + ' - ' + 'Verify errors';


		// show a summary dialog after manager actions
		var SHOW_SUMMARY_DIALOG = false; // TODO reactivate

		// export detailed data as comments (SHA, MD5...) or headers (JSON)
		// such as snapshot date in various formats, earliest/latest file name/date, etc.
		var EXPORT_EXTENDED_DATA = true;

		// show detailed information in DOpus Output for each file after operation
		// files with errors will be put into a collection regardless of this setting
		var DUMP_DETAILED_RESULTS = false;

		// automatically add current date-time to generated export file names
		var APPEND_CURRENT_DATETIME_TO_EXPORT_FILES = false;
		// automatically add file with the latest date-time to generated export file names
		var APPEND_LATEST_FILE_DATETIME_TO_EXPORT_FILES = true;

		// if Export from ADS is clicked but nothing is selected, use all items in the currently displayed tab
		var EXPORT_USE_ALL_ITEMS_IF_NOTHING_SELECTED = true;
		// if Import into ADS is clicked and a single file is selected, use it as source
		var IMPORT_USE_SELECTED_FILE_AS_SOURCE = true;

		// self-explanatory
		var TEMPDIR = '%TEMP%';

		// internal constants - do not touch
		var AS_JSON = true;
		var AS_POJO = true;
	}
}

/*
	8888888 888b    888 8888888 88888888888
	  888   8888b   888   888       888
	  888   88888b  888   888       888
	  888   888Y88b 888   888       888
	  888   888 Y88b888   888       888
	  888   888  Y88888   888       888
	  888   888   Y8888   888       888
	8888888 888    Y888 8888888     888
*/
{
	function __INIT__(){}

	// called by DOpus
	function OnInit(initData) {
		initData.name           = Global.SCRIPT_NAME;
		initData.version        = Global.SCRIPT_VERSION;
		initData.copyright      = Global.SCRIPT_COPYRIGHT;
		initData.url            = Global.SCRIPT_URL;
		initData.desc           = Global.SCRIPT_DESC;
		initData.min_version    = Global.SCRIPT_MIN_VERSION;
		initData.group          = Global.SCRIPT_GROUP;
		initData.log_prefix     = Global.SCRIPT_PREFIX;
		initData.default_enable = true;

		DOpus.ClearOutput();

		_initializeCommands(initData);
		_initializeColumns(initData);
		return false;
	}

	function _getColumnLabelFor(name) {
		return Global.SCRIPT_NAME_SHORT + ' ' + name;
	}
	function _getColumnNameFor(name) {
		return Global.SCRIPT_NAME_SHORT + '_' + name;
	}
	// TODO - REVIEW
	// helper method to get the Icon Name for development and OSP version
	function _getIcon(iconName, scriptPath) {
		var oPath = DOpus.FSUtil.Resolve(scriptPath);
		var isOSP = oPath.ext === 'osp';
		var isOSP = true;
		//logger.normal('Requested icon: ' + iconName + ', is OSP: ' + isOSP + '  --  ' + scriptPath);
		return isOSP
				? '#MTHasher:' + iconName
				: oPath.pathpart + "\\icons\\ME_32_" + iconName + ".png";
	}
	// internal method called by OnInit()
	function _addCommand(name, fnFunction, initData, template, icon, label, desc, hide) {
		var cmd         = initData.AddCommand();
		cmd.name        = Global.SCRIPT_NAME_SHORT + name;
		cmd.method      = funcNameExtractor(fnFunction);
		cmd.template    = template || '';
		cmd.icon		= icon && _getIcon(icon, initData.file) || '';
		cmd.label		= label || '';
		cmd.desc        = desc || label;
		cmd.hide        = typeof hide !== 'undefined' ? hide : false;
	}
	// internal method called by OnInit()
	function _addColumn(name, fnFunction, initData, label, justify, autogroup, autorefresh, multicol) {
		var col         = initData.AddColumn();
		col.method      = funcNameExtractor(fnFunction);
		col.name        = _getColumnNameFor(name);
		col.label       = _getColumnLabelFor(label || name);
		col.justify     = justify;
		col.autogroup   = autogroup;
		col.autorefresh = autorefresh;
		col.multicol    = multicol;
	}
	// internal method called by OnInit()
	function _initializeCommands(initData) {
		/*
			Available icon names, used by GetIcon()
				Add
				Attach
				CopyToClipboard
				Delete
				FileExport-Download
				FileExport-Download2
				FileImport-Upload
				FileImport-Upload2
				FileImportExport
				FindDirty
				FindDirty2
				FindMissing
				GitHub
				Homepage
				QueryInfo
				RefreshUpdate
				Settings
				Sync1
				Sync2
				Unarchive
				Verify
				Warning
		*/
		// function addCommand(initData, name, method, template, icon, label, desc, hide)
		_addCommand('ManagerStart',
			onDOpusCmdMTHManagerStart,
			initData,
			// 'MAXCOUNT/N,MAXWAIT/N,RECURSE/S,COMMAND/K',
			'MAXCOUNT/N,MAXWAIT/N,RECURSE/S,' +
			'CALCULATION_SIMULATION/S,HARD_UPDATE_ADS/S,SMART_UPDATE_ADS/S,VERIFY_FROM_ADS/S,DELETE_ADS/S,' +
			'FIND_DIRTY/S,FIND_MISSING/S,' +
			'IMPORT_FROM_FILE/S,VERIFY_FROM_FILE/S'
			,
			'Add',
			'MTH Manager',
			'Calculates hashes of selected objects and performs an action.\nObjects can be files and folders (with RECURSE)\nUse one of the parameters to specify action.'
			);
		_addCommand('Worker',
			onDOpusCmdMTHWorker,
			initData,
			'THREADID/K,MAXWAIT/N,ACTIONFUNC/K,FILE/K',
			'Warning',
			'MTH Worker (do not call directly!)',
			null,
			true // hide from script commands list
			);
		_addCommand('ClearCache',
			onDOpusCmdMHTClearCache,
			initData,
			'',
			'Delete',
			'MTH Clear Cache',
			'Clears internal cache'
			)
		_addCommand('CopyToClipboard',
			onDOpusCopyToClipboard,
			initData,
			'SKIP_PRECHECK/S',
			'CopyToClipboard',
			'MTH Copy ADS to Clipboard',
			'Copy stored ADS hashes of selected objects to clipboard'
			);
		_addCommand('ADSExportFrom',
			onDOpusADSExportFrom,
			initData,
			'SKIP_PRECHECK/S,FORMAT/K,USE_FORWARD_SLASH/S,FILE/O',
			'FileExport-Download',
			'MTH Export from ADS',
			'Exports stored ADS hashes of selected objects to a file; if filename is supplied and file exists it will be overwritten'
			);
		_addCommand('ADSImportInto',
			onDOpusADSImportInto,
			initData,
			'FORMAT/K,FILE/O',
			'FileImport-Upload',
			'MTH Import into ADS',
			'Imports hashes from selected file to ADS for all matched files by name; the current lister tab path is used to resolve relative paths'
			);
		_addCommand('OnTheFlyCalculateAndExport',
			onDOpusOnTheFlyCalculateAndExport,
			initData,
			'FORMAT/K,FILE/O',
			'FileExport-Download2',
			'MTH On-The-Fly Calculate && Export',
			'Calculates hashes anew without using ADS; if filename is supplied and file exists it will be overwritten'
			);
		_addCommand('OnTheFlyVerifyFromFile',
			onDOpusOnTheFlyVerifyFromFile,
			initData,
			'FORMAT/K,FILE/O',
			'FileImport-Upload2',
			'MTH On-The-Fly Verify (no ADS import)',
			'Verifies hashes in external file against all matched files by relative path & name; the current lister tab path is used to resolve relative paths'
			);
	}
	// internal method called by OnInit()
	function _initializeColumns(initData) {
		// function addColumn(initData, method, name, label, justify, autogroup, autorefresh, multicol)

		// this column is kept separate, no multicol
		_addColumn('HasHashStream',
			onDOpusColHasStream,
			initData,
			'Available',
			'right', false, true, false);

		// all multicol below
		_addColumn('NeedsUpdate',
			onDOpusColMultiCol,
			initData,
			'Dirty',
			'left', false, true, true);

		_addColumn('NeedsUpdateVerbose',
			onDOpusColMultiCol,
			initData,
			'Dirty (Verbose)',
			'left', false, true, true);

		_addColumn('ADSDataFormatted',
			onDOpusColMultiCol,
			initData,
			'ADSData (Formatted)',
			'left', true, true, true);

		_addColumn('ADSDataRaw',
			onDOpusColMultiCol,
			initData,
			'ADSData (Raw)',
			'left', true, true, true);
	}

}


/*
	 .d8888b.   .d88888b.  888b     d888 888b     d888        d8888 888b    888 8888888b.   .d8888b.
	d88P  Y88b d88P" "Y88b 8888b   d8888 8888b   d8888       d88888 8888b   888 888  "Y88b d88P  Y88b
	888    888 888     888 88888b.d88888 88888b.d88888      d88P888 88888b  888 888    888 Y88b.
	888        888     888 888Y88888P888 888Y88888P888     d88P 888 888Y88b 888 888    888  "Y888b.
	888        888     888 888 Y888P 888 888 Y888P 888    d88P  888 888 Y88b888 888    888     "Y88b.
	888    888 888     888 888  Y8P  888 888  Y8P  888   d88P   888 888  Y88888 888    888       "888
	Y88b  d88P Y88b. .d88P 888   "   888 888   "   888  d8888888888 888   Y8888 888  .d88P Y88b  d88P
	 "Y8888P"   "Y88888P"  888       888 888       888 d88P     888 888    Y888 8888888P"   "Y8888P"
*/
{
	// CLEAR CACHE
	// called by user command, button, etc.
	function onDOpusCmdMHTClearCache(cmdData) {
		var fnName = funcNameExtractor(onDOpusCmdMHTClearCache);

		util.sv.Set('cache') = DOpus.Create.Map();
		logger.force(sprintf('%s -- Cache cleared', fnName));
	}
	function onDOpusCopyToClipboard(cmdData) {
		var fnName = funcNameExtractor(onDOpusCopyToClipboard);

		var res = _getHashesOfAllSelectedFiles(cmdData);
		if (!res) return;
		util.cmd.RunCommand('Clipboard SET ' + JSON.stringify(res, null, 4));
	}
	function onDOpusADSExportFrom(cmdData) {
		var fnName = funcNameExtractor(onDOpusADSExportFrom);

		// check command parameters
		var format          = cmdData.func.args.FORMAT;
		var filename        = cmdData.func.args.FILE;
		var useForwardSlash = cmdData.func.args.got_arg.USE_FORWARD_SLASH;
		if (!format || !fileExchangeHandler.isValidFormat(format)) {
			abortWithFatalError('No or invalid format supplied for FORMAT parameter,\nvalid formats are:\n' + fileExchangeHandler.getValidFormats());
		}

		// get the hashes
		var res = _getHashesOfAllSelectedFiles(cmdData);
		if (!res) return;

		fileExchangeHandler.exportTo(cmdData, format, filename, res, useForwardSlash);
	}
	function onDOpusADSImportInto(cmdData) {
		var fnName = funcNameExtractor(onDOpusADSImportInto);

		// check command parameters
		var format          = cmdData.func.args.FORMAT;
		var filename        = cmdData.func.args.FILE;

		fileExchangeHandler.importFrom(cmdData, format, filename);
	}
	function onDOpusOnTheFlyCalculateAndExport(cmdData) {
		var fnName = funcNameExtractor(onDOpusOnTheFlyCalculateAndExport);
		abortWithFatalError('Not impl yet - ' + fnName);
	}
	function onDOpusOnTheFlyVerifyFromFile(cmdData) {
		var fnName = funcNameExtractor(onDOpusOnTheFlyVerifyFromFile);

		// check command parameters
		var format          = cmdData.func.args.FORMAT;
		var filename        = cmdData.func.args.FILE;

		// fileExchangeHandler.verifyFrom(scriptCmdData, format, filename);
		abortWithFatalError('Not impl yet - ' + fnName);
	}

	var fileExchangeHandler = (function(){
		var myName = 'fileExchangeHandler';
		var VALID_FORMATS_AND_EXTS = {
			MD5     : ['MD5',  '.md5'],
			SHA1    : ['SHA1', '.sha1'],
			JSON    : ['JSON', '.json']
		}
		var SHA1_MD5_SPLITTER = new RegExp(/(^\s*\b[a-zA-Z0-9]+)\b\s+\*(.+)$/);
		function convertForExportToMD5(oInternalJSONFormat) {
			return convertForExportToSHA1(oInternalJSONFormat);
		}
		function convertForExportToSHA1(oInternalJSONFormat) {
			var outstr = sprintf('; Checksums generated by %s v%s\n; %s\n', Global.SCRIPT_NAME, Global.SCRIPT_VERSION, Global.SCRIPT_URL);
			if (EXPORT_EXTENDED_DATA) {
				outstr += ';\n';
				for (var kheader in oInternalJSONFormat) {
					if (typeof oInternalJSONFormat[kheader] !== 'string') continue; // skip objects, arrays, functions...
					outstr += sprintf('; %s: %s', kheader, oInternalJSONFormat[kheader]) + '\n';
				}
			} else {
				outstr += '; Snapshot (Compact Date): ' + getTS().formatAsDateTimeCompact() + '\n';
			}
			outstr += '\n';
			for (var kitem in oInternalJSONFormat.items) {
				if (!oInternalJSONFormat.items.hasOwnProperty(kitem)) continue; // skip prototype stuff

				var item = oInternalJSONFormat.items[kitem];
				outstr += item.hash + ' *' + (item.relpath ? item.relpath + '\\' : '') + item.name + '\n';
			}
			return outstr;
		}
		function convertForExportToMTHJSON(oInternalJSONFormat) {
			return JSON.stringify(oInternalJSONFormat, null, '\t');
		}
		function convertForImportFromMD5(sContents, currentPath) {
			return convertForImportFromSHA1(sContents, currentPath);
		}
		function convertForImportFromSHA1(sContents, currentPath) {
			var dummy = new HashedItemsCollection();

			var lines    = sContents ? sContents.split(/\n/) : [],
				// outPOJO  = new ConversionResults();
				outPOJO  = {},
				hash     = '',
				relpath  = '',
				fullpath = '';

			for (var i = 0; i < lines.length; i++) {
				var line = lines[i].trim();
				if (line.indexOf(';') === 0) {
					continue; // comment lines
				}
				// split line to hash & relpath parts
				var lineParts = line.match(SHA1_MD5_SPLITTER);
				if (!lineParts || lineParts.length !== 3) {
					abortWithFatalError('Given file does not match expected format in line:\n' + line);
				}
				// find out the target full paths from current path & relative paths
				hash     = lineParts[1];
				relpath  = lineParts[2];
				fullpath = currentPath + relpath;
				logger.verbose('Hash: ' + hash + '\tRelPath: ' + relpath + '\tFullPath: ' + fullpath);
				var oItem = DOpus.FSUtil.GetItem(fullpath);
				if (!IsValidPath(oItem.realpath)) {
					// outPOJO.errors.push({ hash: hash, relpath: relpath, error: 'Not found: ' + oItem.realpath });
					dummy.addItem(new HashedItem(oItem, relpath, false, 'Not found: ' + oItem.realpath, hash));
					continue;
				} else {
					var _tmp = packageAsPOJO(oItem, hash);
					_tmp.relpath = ''+oItem.path;
					_tmp.name    = ''+oItem.name;
					outPOJO.items[oItem.realpath] = _tmp;
				}
			}
			return outPOJO;
		}
		function convertForImportFromJSON(sContents, currentPath) {
			// TODO - currently there is no automatic path adjustment
			// future release may implement smart path adjustment with the given path (currentPath)
			var outPOJO = new ConversionResults();
			try {
				outPOJO = JSON.parse(sContents);
			} catch (e) {
				abortWithFatalError('Given file contents cannot be parsed as valid JSON');
			}
			logger.force(sprintf('%s -- outPOJO: %s', 'fnName', JSON.stringify(outPOJO, null, 4)));

			if (
				 !outPOJO.rootPath || !IsValidPath(outPOJO.rootPath) ||
				// !outPOJO.Algorithm || !VALID_FORMATS_AND_EXTS[outPOJO.Algorithm.toUpperCase()]
				 (outPOJO.ValidCount && typeof outPOJO.ValidCount !== 'number') ||
				 (outPOJO.InvalidCount && typeof outPOJO.InvalidCount !== 'number') ||
				  !isObject(outPOJO.items) ||
				(outPOJO.errors && typeof outPOJO.errors.length !== 'number')
			) {
				abortWithFatalError('Given file contents do not match expected format, unexpected key: ' + unexpectedField);
			}
			return outPOJO;
		}
		function prepareForExport(cmdData, format, filename, oInternalJSONFormat, useForwardSlash) {
			var fnName = 'ImportExportFormatters.exportTo';

			var currentPath = doh.getCurrentPath(cmdData),
				dialog      = doh.getDialog(cmdData),
				outFilename = '';

			if (filename) {
				// validate given filename - but we may not check for existence!
				var oItem = DOpus.FSUtil.GetItem(filename);
				if (!oItem.path) {
					oItem = DOpus.FSUtil.GetItem(currentPath + filename);
				}
				if (!oItem.path) {
					abortWithFatalError('Given filepath ' + filename + ' is not valid');
				}
				outFilename = ''+oItem.realpath;
			} else {
				// determine suggested file name & show a Save Dialog
				var defaultName = (''+currentPath).replace(/[\\:]/g, '_').replace(/_*$/, '').replace(/_+/, '_') + (useForwardSlash ? '_FS' : ''),
					nameSuffix  = APPEND_CURRENT_DATETIME_TO_EXPORT_FILES ? ' - ' + getTS().formatAsDateTimeCompact() :
					              APPEND_LATEST_FILE_DATETIME_TO_EXPORT_FILES ? ' - ' + oInternalJSONFormat.Latest_File_DateTime_TS.formatAsDateTimeCompact() : '',
					ext         = VALID_FORMATS_AND_EXTS[format.toUpperCase()][1];
				outFilename     = currentPath + defaultName + nameSuffix + ext;
				logger.normal(sprintf('%s -- currentPath: %s, Format: %s, useForwardSlash: %b, Suggested File Name: %s', fnName, currentPath, format, useForwardSlash, outFilename));

				var oPath = dialog.Save('Save As', outFilename, '*.' + ext);
				if (!oPath.result) return;
				outFilename = ''+oPath;
			}

			// convert to output format
			var outContents = '';
			switch(format.toUpperCase()) {
				case VALID_FORMATS_AND_EXTS.MD5[0]:
					outContents = convertForExportToMD5(oInternalJSONFormat); break;
				case VALID_FORMATS_AND_EXTS.SHA1[0]:
					outContents = convertForExportToSHA1(oInternalJSONFormat); break;
				case VALID_FORMATS_AND_EXTS.JSON[0]:
					outContents = convertForExportToMTHJSON(oInternalJSONFormat); break;
				default:
					abortWithFatalError('Given format ' + format + ' is unknown or not yet implemented');
			}
			if (useForwardSlash) outContents = outContents.replace(/\\/mg, '/');

			logger.normal(sprintf('%s -- filename: %s', fnName, outFilename));

			return { filename: outFilename, contents: outContents };
		}
		function prepareForImport(cmdData, format, filename) {
			var fnName = 'ImportExportFormatters.importFrom';

			var currentPath = doh.getCurrentPath(cmdData),
				dialog      = doh.getDialog(cmdData),
				inFilename  = '';

			var ext = format || CURRENT_ALGORITHM, // TODO
				detectedFormat;
			if (filename) {
				// validate given filename
				if(!IsValidPath(filename)) {
					if (!IsValidPath(currentPath + filename)) {
						abortWithFatalError('Given filepath ' + filename + ' is not valid');
					} else {
						inFilename = currentPath + filename;
					}
				}
			} else if (IMPORT_USE_SELECTED_FILE_AS_SOURCE && doh.getSelFilesCount(cmdData) === 1) {
				// if a single file is selected use it as source
				var oItem = doh.getSelFileAsItem(cmdData);
				inFilename = ''+oItem.realpath;
				logger.normal(sprintf('%s -- Using selected file as input: %s', fnName, inFilename));
				// check if file can be used
				detectedFormat = fileExchangeHandler.detectFormatFromName(inFilename);
				if (!detectedFormat) {
					logger.normal(sprintf('%s -- Selected file\'s format is not recognized: %s', fnName, detectedFormat));
					inFilename = '';
				}
			}
			if (!inFilename) {
				// show an Open Dialog
				var oPath = dialog.Open('Open', currentPath, '*.' + ext);
				if (!oPath.result) return;
				inFilename = ''+oPath;
			}
			logger.normal(sprintf('%s -- inFilename: %s', fnName, inFilename));

			// determine format
			if (!format) {
				detectedFormat = fileExchangeHandler.detectFormatFromName(inFilename);
				logger.normal(sprintf('%s -- Detected format: %s', fnName, detectedFormat));
				if (detectedFormat) format = detectedFormat;
			}
			// check if given format is valid
			// TODO - very crappy at the moment
			detectedFormat = fileExchangeHandler.detectFormatFromName(inFilename);

			if (format.toLowerCase() !== detectedFormat.toLowerCase()) {
				abortWithFatalError('given filename & format do not match\nGiven: ' + format + ', Detected: ' + detectedFormat);
			}
			logger.normal(sprintf('%s -- Using filename: %s, format: %s', fnName, inFilename, format));

			// read file
			var inContents = ReadFile(inFilename);
			logger.verbose(sprintf('%s -- Input:\n%s', fnName, inContents));

			// convert to internal format and fill in values
			var inPOJO = new ConversionResults({}, [], currentPath, format.toLowerCase(), 0, 0);
			var res;
			switch(format.toUpperCase()) {
				case VALID_FORMATS_AND_EXTS.MD5[0]:
					res = convertForImportFromMD5(inContents, currentPath); break;
				case VALID_FORMATS_AND_EXTS.SHA1[0]:
					res = convertForImportFromSHA1(inContents, currentPath); break;
				case VALID_FORMATS_AND_EXTS.JSON[0]:
					res = convertForImportFromJSON(inContents, currentPath); break;
				default:
					abortWithFatalError('Given format ' + format + ' is unknown or not yet implemented');
			}
			inPOJO.items        = res.items || {};
			inPOJO.errors       = res.errors || [];
			inPOJO.ValidCount   = inPOJO.items.keys().length;
			inPOJO.InvalidCount = inPOJO.errors.length;
			logger.normal(sprintf('%s -- Input as JSON:\n%s', fnName, JSON.stringify(inPOJO, null, 4)));

			return inPOJO;
		}
		return {
			name: myName,
			importFrom: function(cmdData, format, filename) {
				var fnName = 'fileExchangeHandler.importFrom';

				var inPOJO = prepareForImport(cmdData, format, filename);

				// user aborted
				if (!inPOJO) return;
				// we have a valid POJO in internal format
				var msg    = '',
					res    = false,
					dialog = doh.getDialog(cmdData);
				if (!inPOJO.ValidCount && !inPOJO.InvalidCount) {
					msg = 'Invalid/empty format or file.\n\nNo filenames could be parsed from input file.\nCheck the format and/or file contents.\nHere is what could be parsed:\n' + JSON.stringify(inPOJO, null, 4);
					res = showMessageDialog(dialog, msg, 'Invalid/empty format or file', 'OK');
				} else if (inPOJO.ValidCount && inPOJO.InvalidCount) {
					msg = sprintf('Partial success.\n\nFiles which can imported successfully: %d\n\nFiles which cannot be imported: %d\nIf you proceed, the names will be copied to clipboard.\n\nDo you want to proceed?', inPOJO.ValidCount, inPOJO.InvalidCount);
					res = showMessageDialog(dialog, msg, 'Partial success', 'OK|CANCEL');
				} else if (!inPOJO.ValidCount && inPOJO.InvalidCount) {
					msg = sprintf('Failure!\n\nNo files can be imported successfully!\nIf the input file is valid, check if the files are under the current path.\n\nFiles which cannot be imported: %d\nIf you proceed, the names will be copied to clipboard.\n\nDo you want to proceed?', inPOJO.InvalidCount);
					res = showMessageDialog(dialog, msg, 'Failure', 'OK|Cancel');
				} else if (inPOJO.ValidCount && !inPOJO.InvalidCount) {
					msg = sprintf('Success!\n\nAll files can be imported successfully.\n\nWARNING: Existing hashes will be overwritten!\n\nDo you want to proceed?');
					res = showMessageDialog(dialog, msg, 'Success', 'OK|Cancel');
				}
				if (!res) {
					logger.normal(sprintf('%s -- User cancelled: %b ...exiting', fnName, !res));
					return; // user cancelled
				}
				// copy the files with errors into clipboard
				if (inPOJO.errors.length) {
					util.cmd.RunCommand('Clipboard SET ' + JSON.stringify(inPOJO.errors, null, 4));
				}
				var importErrors = []
				for (var filepath in inPOJO.items) {
					if (!inPOJO.items.hasOwnProperty(filepath)) continue;
					var oItem = DOpus.FSUtil.GetItem(filepath);
					if(ADS.save(oItem, packageAsPOJO(oItem, inPOJO.items[filepath].hash))) {
						// items: array of [ { 'path': string, 'name': string, 'size': number }, ... ]
						// importErrors.push(''+oItem.realpath);
						importErrors.push({ path: ''+oItem.realpath });
					}
				}
				if (importErrors.length) {
					for (var i = 0; i < importErrors.length; i++) {
						var el = importErrors[i];
						logger.force(sprintf('%s -- Error: %s', fnName, el));
					}
					addFilesToCollection(importErrors, COLLECTION_FOR_IMPORT_ERRORS);
				}
				// addFilesToCollection(inPOJO.errors, COLLECTION_FOR_IMPORT_ERRORS);
				// abortWithFatalError('NOT IMPL YET - Save to ADS');
			},
			verifyFrom: function(cmdData, format, filename) {
				var fnName = 'fileExchangeHandler.verifyFrom';

				var inPOJO = prepareForImport(cmdData, format, filename);
				// user aborted
				if (!inPOJO) return;
				// we have a valid POJO in internal format
				if (inPOJO.InvalidCount) {
					showMessageDialog(null, 'Some files will not be verified, these will be put into collection:\n' + COLLECTION_FOR_VERIFY_ERRORS);
				}
				abortWithFatalError('NOT IMPL YET - Verify from external file');
			},
			exportTo: function(cmdData, format, filename, oInternalJSONFormat, useForwardSlash) {
				var fnName = 'fileExchangeHandler.exportTo';

				var res = prepareForExport(cmdData, format, filename, oInternalJSONFormat, useForwardSlash);
				if (!res) return;
				SaveFile(res.filename, res.contents);
			},
			isValidFormat: function(format) {
				return (format && VALID_FORMATS_AND_EXTS.hasOwnProperty(format.toUpperCase()));
			},
			isValidExtension: function(extension) {
				for (var f in VALID_FORMATS_AND_EXTS) {
					if (extension && VALID_FORMATS_AND_EXTS[f][1] === extension.toLowerCase()) return true;
				}
				return false;
			},
			getValidFormats: function() {
				var outstr = '';
				for(var k in VALID_FORMATS_AND_EXTS) {
					outstr += k + '\n';
				}
				return outstr;
			},
			detectFormatFromName: function(filename) {
				var oItem = DOpus.FSUtil.GetItem(filename);
				if (!oItem) return false;
				switch(oItem.ext.toLowerCase()) {
					case VALID_FORMATS_AND_EXTS.MD5[1]:  return VALID_FORMATS_AND_EXTS.MD5[0];
					case VALID_FORMATS_AND_EXTS.SHA1[1]: return VALID_FORMATS_AND_EXTS.SHA1[0];
					case VALID_FORMATS_AND_EXTS.JSON[1]: return VALID_FORMATS_AND_EXTS.JSON[0];
					default:                             return false;
				}
			}
		};
	}());

	function _getHashesOfAllSelectedFiles(cmdData) {
		var fnName = funcNameExtractor(_getHashesOfAllSelectedFiles);

		var skipCheck = cmdData.func.args.got_arg.SKIP_PRECHECK || false;

		// check if tab is up-to-date
		var tabIsDirty = doh.isDirty(cmdData);
		if (tabIsDirty) {
			showMessageDialog(doh.getDialog(cmdData), 'Lister tab contents are not up-to-date, please refresh first');
			return;
		}

		// check if all files have valid hashes
		var fnFilter = 'fnFilterAcceptWithValidHashesOnly';
		busyIndicator.start(cmdData.func.sourcetab, sprintf('%s -- Filter: %s', fnName, fnFilter));
		var itemsFiltered;
		if (EXPORT_USE_ALL_ITEMS_IF_NOTHING_SELECTED && doh.getSelItemsCount(cmdData) === 0) {
			logger.info(sprintf('%s -- Nothing selected, using all items', fnName));
			itemsFiltered = applyFilterToSelectedItems(doh.getAllItems(cmdData), true, fnFilter);
		} else {
			logger.info(sprintf('%s -- Some items selected, using selected', fnName));
			itemsFiltered = applyFilterToSelectedItems(doh.getSelItems(cmdData), true, fnFilter);
		}
		busyIndicator.stop();

		if (!skipCheck && itemsFiltered.skipped && itemsFiltered.skipped.length) {
			showMessageDialog(doh.getDialog(cmdData), 'Some selected files, incl. subdirs, have\nno or outdated hashes.\nPlease update first, e.g. via Smart Update.\n');
			return;
		}
		if (!itemsFiltered.items.length) {
			var msg = '', title = '';
			if (doh.getSelItemsCount(cmdData)) {
				title = 'No suitable files found';
				msg = sprintf('Nothing to do, quitting...\n\nNo suitable files found for the requested\nAction: %s\nFilter: %s', actionName, fnFilter);
			} else {
				title = 'Nothing selected'
				msg = sprintf('Nothing selected');
			}
			showMessageDialog(doh.getDialog(cmdData), msg, title);
			return;
		}

		// everything ok, proceed
		var currentPath  = doh.getCurrentPath(cmdData),
			itemsPOJO    = {},
			dateEarliest = 253402214400000, // 9999-12-31
			dateLatest   = 0,
			fileEarliest = '',
			fileLatest   = '';
		for (var i = 0; i < itemsFiltered.items.length; i++) {
			var item        = itemsFiltered.items[i],
				oItem       = DOpus.FSUtil.GetItem(item.path),
				currentPOJO = ADS.read(oItem);
			if (!currentPOJO) {
				abortWithFatalError('Cannot read stream data for: ' + item.path);
			}
			// check for earliest and latest file modification dates
			var _tmp = new Date(oItem.modify).valueOf();
			if (dateEarliest > _tmp) {
				fileEarliest = ''+oItem.realpath;
				dateEarliest = _tmp;
			}
			if (dateLatest < _tmp) {
				fileLatest = ''+oItem.realpath;
				dateLatest = _tmp;
			}
			// remove cache only fields if necessary
			removeCacheFields(currentPOJO);
			// enrich with useful info
			currentPOJO['relpath']  = (''+oItem.path).replace(currentPath, '');
			currentPOJO['name']     = ''+oItem.name;
			itemsPOJO[item.path] = currentPOJO;
		}
		logger.verbose(sprintf('%s -- Date Earliest: %s, Latest: %s', fnName, dateEarliest, dateLatest));

		// build the output POJO
		var now = getTS();
		var outPOJO = {
			RootPath                       : currentPath,
			Algorithm                      : CURRENT_ALGORITHM,
			ValidCount                     : itemsFiltered.items.length,
			InvalidCount                   : 0,
			Generated_By                   : sprintf('%s v%s -- %s', Global.SCRIPT_NAME, Global.SCRIPT_VERSION, Global.SCRIPT_URL),
			Snapshot_DateTime_Compact      : now.formatAsDateTimeCompact(),
			Snapshot_DateTime_Timestamp    : now,
			Snapshot_DateTime_DOpus        : now.formatAsDateDOpus(),
			Snapshot_DateTime_ISO          : now.formatAsDateISO(),
			Snapshot_DateTime_String       : new Date(now).toString(),
			Snapshot_DateTime_UTC          : new Date(now).toUTCString(),
			Snapshot_DateTime_Locale       : new Date(now).toLocaleString(),
			Earliest_File_Name             : fileEarliest,
			Latest_File_Name               : fileLatest,
			Earliest_File_DateTime_TS      : dateEarliest,
			Latest_File_DateTime_TS        : dateLatest,
			Earliest_File_DateTime_Compact : new Date(dateEarliest).getTime().formatAsDateTimeCompact(),
			Latest_File_DateTime_Compact   : new Date(dateLatest).getTime().formatAsDateTimeCompact(),
			items                          : itemsPOJO,
			errors                         : []
		}
		logger.verbose(sprintf('%s -- result:\n%s', fnName, JSON.stringify(outPOJO, null, 4))); // this might not be displayed if string too big
		return outPOJO;
	}
}

/*
	 .d8888b.   .d88888b.  888      888     888 888b     d888 888b    888  .d8888b.
	d88P  Y88b d88P" "Y88b 888      888     888 8888b   d8888 8888b   888 d88P  Y88b
	888    888 888     888 888      888     888 88888b.d88888 88888b  888 Y88b.
	888        888     888 888      888     888 888Y88888P888 888Y88b 888  "Y888b.
	888        888     888 888      888     888 888 Y888P 888 888 Y88b888     "Y88b.
	888    888 888     888 888      888     888 888  Y8P  888 888  Y88888       "888
	Y88b  d88P Y88b. .d88P 888      Y88b. .d88P 888   "   888 888   Y8888 Y88b  d88P
	 "Y8888P"   "Y88888P"  88888888  "Y88888P"  888       888 888    Y888  "Y8888P"
*/
{
	function onDOpusColHasStream(scriptColData){
		var item = scriptColData.item;
		if (item.is_dir || item.is_reparse || item.is_junction || item.is_symlink) return;
		var res = ADS.hasHashStream(item);
		scriptColData.value = res ? 'Yes' : 'No';
		scriptColData.group = 'Has Metadata: ' + scriptColData.value;
		return res;
	}
	function onDOpusColMultiCol(scriptColData) {
		var fnName = funcNameExtractor(onDOpusColMultiCol);

		var ts1 = new Date().getTime();

		var item = scriptColData.item;
		if (item.is_dir || item.is_reparse || item.is_junction || item.is_symlink ) return;
		logger.info('...Processing ' + item.name);

		// get ADS object
		var item_props = ADS.read(item);
		if (item_props === false || typeof item_props === 'undefined' || !isObject(item_props)) {
			// logger.normal(item.name + ': Metadata does not exist or INVALID');
			return;
		}

		// iterate over requested columns
		for (var e = new Enumerator(scriptColData.columns); !e.atEnd(); e.moveNext()) {
			var key = e.item();

			var outstr = '';

			switch(key) {
				case _getColumnNameFor('NeedsUpdate'):
					var differentModifDate = new Date(item.modify).valueOf() !== item_props.last_modify,
						differentSize      = parseInt(item.size)             !== item_props.last_size;
					outstr = differentModifDate || differentSize ? 1 : 0;
					scriptColData.columns(key).group = 'Needs update: ' + (outstr ? 'Yes' : 'No');
					scriptColData.columns(key).value = outstr;
					break;

				case _getColumnNameFor('NeedsUpdateVerbose'):
					var differentModifDate = new Date(item.modify).valueOf() !== item_props.last_modify,
						differentSize      = parseInt(item.size)             !== item_props.last_size;
					outstr = differentModifDate || differentSize ? 1 : 0;
					if (differentModifDate && differentSize) {
						outstr += ' (date & size)';
					} else if (differentModifDate) {
						outstr += ' (date)';
					} else if (differentSize) {
						outstr += ' (size)';
					}
					scriptColData.columns(key).group = 'Needs update (Verbose): ' + (outstr ? 'Yes' : 'No');
					scriptColData.columns(key).value = outstr;
					break;

				case _getColumnNameFor('ADSDataRaw'):
					scriptColData.columns(key).value = JSON.stringify(item_props);
					break;

				case _getColumnNameFor('ADSDataFormatted'):
					scriptColData.columns(key).value = JSON.stringify(item_props, null, "\t");
					break;
			} // switch
		} // for enum
		var ts2 = new Date().getTime();
		logger.verbose('OnMExt_MultiColRead() -- Elapsed: ' + (ts2 - ts1) + ', current: ' + ts2);
	}
}

/*
	888b     d888        d8888 888b    888        d8888  .d8888b.  8888888888 8888888b.
	8888b   d8888       d88888 8888b   888       d88888 d88P  Y88b 888        888   Y88b
	88888b.d88888      d88P888 88888b  888      d88P888 888    888 888        888    888
	888Y88888P888     d88P 888 888Y88b 888     d88P 888 888        8888888    888   d88P
	888 Y888P 888    d88P  888 888 Y88b888    d88P  888 888  88888 888        8888888P"
	888  Y8P  888   d88P   888 888  Y88888   d88P   888 888    888 888        888 T88b
	888   "   888  d8888888888 888   Y8888  d8888888888 Y88b  d88P 888        888  T88b
	888       888 d88P     888 888    Y888 d88P     888  "Y8888P88 8888888888 888   T88b
*/
{
	function __MANAGER__(){}
	// called by custom DOpus command
	function onDOpusCmdMTHManagerStart(cmdData) {
		var fnName = funcNameExtractor(onDOpusCmdMTHManagerStart);

		// VALIDATE PARAMETERS
		{
			var param = validateManagerParameters(cmdData);
			if (param === false) return;
		}


		var tsStart = getTS();
		DOpus.ClearOutput();
		// runaway stoppers for while loops
		var itermax = Math.round(2 * param.maxwait / (sleepdur||1)), itercnt = 0;
		var userAborted = false;

		logger.verbose(sprintf('%s -- Operating parameters: %s', fnName, JSON.stringify(param, null, '\t')));

		// FILTERS, ACTIONS AND COLLECTIONS
		{
			var actionName, collectionName, fnFilter, fnFilterName, fnAction, fnActionName;
			switch(true) {
				case param.hard_update_ads:
					actionName = 'HARD_UPDATE_ADS';        fnFilter = filters.PUBLIC.fnFilterAcceptAnyFile;             fnAction = actions.PUBLIC.fnActionCalculateAndSaveToADS;    break;
				case param.verify_from_ads:
					actionName = 'VERIFY_FROM_ADS';        fnFilter = filters.PUBLIC.fnFilterAcceptWithValidHashesOnly; fnAction = actions.PUBLIC.fnActionCalculateAndCompareToADS; break;
				case param.smart_update_ads:
					actionName = 'SMART_UPDATE_ADS';       fnFilter = filters.PUBLIC.fnFilterAcceptMissingOrDirty;      fnAction = actions.PUBLIC.fnActionCalculateAndSaveToADS;    break;
				case param.delete_ads:
					actionName = 'DELETE_ADS';             fnFilter = filters.PUBLIC.fnFilterAcceptWithHashes;          fnAction = actions.PUBLIC.fnActionDeleteADS;                break;
				case param.calculation_simulation:
					actionName = 'CALCULATION_SIMULATION'; fnFilter = filters.PUBLIC.fnFilterAcceptAnyFile;             fnAction = actions.PUBLIC.fnActionCalculateOnly;            break;
				case param.find_dirty:
					actionName = 'FIND_DIRTY';             fnFilter = filters.PUBLIC.fnFilterAcceptDirtyOnly;           fnAction = actions.PUBLIC.fnActionNull;                   collectionName = COLLECTION_FOR_DIRTY; break;
				case param.find_missing:
					actionName = 'FIND_MISSING';           fnFilter = filters.PUBLIC.fnFilterRejectWithHashes;          fnAction = actions.PUBLIC.fnActionNull;                   collectionName = COLLECTION_FOR_MISSING; break;
				case param.import_from_file:
					showMessageDialog(doh.getDialog(cmdData), 'Not implemented yet'); return;
					actionName = 'IMPORT_FROM_FILE';       fnFilter = filters.PUBLIC.fnFilterAcceptAnyFile;             break;
				case param.verify_from_file:
					showMessageDialog(doh.getDialog(cmdData), 'Not implemented yet'); return;
					actionName = 'VERIFY_FROM_FILE';       fnFilter = filters.PUBLIC.fnFilterAcceptAnyFile;             break;
			}
			fnFilterName = filters.getName(fnFilter); // do not remove, checks if the action is valid and callable via actions.getFunc(fnAction)
			fnActionName = actions.getName(fnAction); // do not remove, checks if the filter is valid and callable via filters.getFunc(fnFilter)
			logger.force(sprintf('%s -- Selected Action: %s, Using Filter: %s, Action: %s', fnName, actionName, fnFilterName, fnActionName));
		}

		var selectedItemsEnumerable = doh.getSelItems(cmdData);

		// SELECTION & FILTERING
		{
			busyIndicator.start(cmdData.func.sourcetab, sprintf('%s -- Filter: %s, Action: %s', fnName, fnFilterName, fnActionName));
			var selectedFiltered   = applyFilterToSelectedItems(selectedItemsEnumerable, true, fnFilter);
			var selectedItemsCount = selectedFiltered.items.length;
			var selectedItemsSize  = selectedFiltered.totalsize;
			busyIndicator.stop();

			// if a collection name is set, we only need to show the selection & filtering results
			if (collectionName) {
				logger.force(stopwatch.startAndPrint(fnName, 'Populating collection', 'Collection name: ' + collectionName));
				addFilesToCollection(selectedFiltered.items, collectionName);
				logger.force(stopwatch.stopAndPrint(fnName, 'Populating collection'));
				return;
			}
			// nothing to do
			if (!selectedItemsCount) {
				var msg = '', title = '';
				if (doh.getSelItemsCount(cmdData)) {
					title = 'No suitable files found';
					msg = sprintf('Nothing to do, quitting...\n\nNo suitable files found for the requested\nAction: %s\nFilter: %s', actionName, fnFilterName);
				} else {
					title = 'Nothing selected'
					msg = sprintf('Nothing selected');
				}
				showMessageDialog(doh.getDialog(cmdData), msg, title);
				return;
			}

		}


		// SPLITTING / KNAPSACKING
		{
			var selectedKnapsacked = knapsackItems(selectedFiltered.items, selectedFiltered.totalsize, param.maxcount, PROCESS_BIGGEST_FILES_FIRST);
			for (var ki = 0; ki < selectedKnapsacked.knapsacks.length; ki++) {
				var ks = selectedKnapsacked.knapsacks[ki];
				// assign the knapsack a threadID so that we can check poll the thread status and results below
				// this does not need to be assigned up here, I do it only for logging purposes
				selectedKnapsacked.knapsacks[ki]['threadID'] = getNewThreadID();
				logger.normal(sprintf('%s -- Knapsack #%02d, thread ID: %s, stats - Length: %5d, Capacity: %10d', fnName, ki, ks['threadID'], ks['items'].length, ks['capacity']));
			}
		}


		// INITIALIZE PROGRESS BAR
		{
			var unitMax      = selectedItemsSize.getUnit();
			var formattedMax = selectedItemsSize.formatAsSize(unitMax);
			var progbar      = initializeProgressBar(cmdData);
		}


		// INITIALIZE THREAD POOL
		{
			util.sv.Set('TP') = DOpus.Create.Map();
			var tp = util.sv.Get('TP');
		}


		// SEND SELECTED FILES TO WORKER THREADS
		{
			for (var ki = 0; ki < selectedKnapsacked.knapsacks.length; ki++) {
				var ks = selectedKnapsacked.knapsacks[ki];
				//logger.force(sprintf('%s -- Knapsack stats - Length: %5d, Capacity: %10d', fnName, ks['items'].length, ks['capacity']));

				// prepare the variables for this knapsack's worker
				var torun = sprintf('%s %s THREADID="%s" MAXWAIT=%s ACTIONFUNC=%s', util.dopusrt, WORKER_COMMAND, ks['threadID'], param.maxwait, fnActionName);

				// update the knapsack with the threadID
				// so that we can check poll the thread status and results below
				// selectedKS.knapsacks[ki]['threadID'] = threadID;
				// ks['threadID'] = threadID;

				// put all files in this knapsack into a map
				var filesMap = DOpus.Create.Map();
				fileloop:for (var i = 0; i < ks.items.length; i++) {
					selitem = ks.items[i]; // this has 3 attribs: path, name, size
					// logger.force(sprintf('%s -- KS[%2d] - selitem: %s', fnName, ki, JSON.stringify(selitem)));
					// create a new DOpus map for this file
					new_file               = DOpus.Create.Map();
					new_file('maxwait')    = param.maxwait;
					new_file('filename')   = selitem.name;
					new_file('filepath')   = selitem.path;
					new_file('filesize')   = selitem.size;
					new_file('finished')   = false; // if it timed out or was unfinished for any reason
					new_file('elapsed')    = 0;
					new_file('timeout')    = false;
					new_file('error')      = false;
					new_file('hash')       = false;
					new_file('finalized')  = false; // if the file has been processed completely, can include timed out files

					filesMap(selitem['path']) = new_file;
				}
				// put this knapsack into thread pool
				tp(ks['threadID']) = filesMap;
				util.sv.Set('TP') = tp;
				logger.normal(sprintf('%s -- Worker command to run: %s', fnName, torun));
				util.cmd.RunCommand(torun);
			}
		}



		// ALL THREADS STARTED - NOW MONITOR THEM
		{
			logger.force('');
			logger.force('');
			logger.force('');
			logger.force(sprintf('%s -- All workers started', fnName));
			logger.force('');
			logger.force('');
			logger.force('');

			logger.force(stopwatch.startAndPrint(fnName, 'Progress Bar'));

			var all_knapsacks_finished = false, ts = getTS();
			var finished_bytes_so_far = 0;
			itercnt = 0;
			unfinished: while(!all_knapsacks_finished && ++itercnt < itermax && getTS() - ts < param.maxwait) {
				// logger.force(sprintf('%s -- iteration %d/%d', fnName, itercnt, itermax));
				DOpus.Delay(sleepdur);
				all_knapsacks_finished = true;
				for (var ki = 0; ki < selectedKnapsacked.knapsacks.length; ki++) {
					var ks = selectedKnapsacked.knapsacks[ki];
					DOpus.Delay(sleepdur);
					if (ks['finished']) {
						// logger.force(sprintf('%s -- Skipping knapsack #%d already finished', fnName, ki));
						continue; // do not re-iterate over already finished knapsacks
					}
					logger.verbose(sprintf('%s -- Knapsack #%d unfinished...', fnName, ki));

					var threadID               = selectedKnapsacked.knapsacks[ki]['threadID'];
					var this_knapsack_finished = true;
					var ksMap                  = tp(threadID);
					// logger.force(sprintf('%s -- KS Thread ID: %s', fnName, threadID));
					for (var e = new Enumerator(ksMap); !e.atEnd(); e.moveNext()) {
						var ksItemKey = e.item();         // full path is the key, as we put it in the manager
						var ksItemVal = ksMap(ksItemKey); // map with: maxwait, filename, filepath, filesize, finished, elapsed, timeout, error, result
						// logger.force(sprintf('%s -- ksItemVal("filename"): %s, finished: %b', fnName, ksItemVal('filename'), ksItemVal('finished')));

						// check for any unfinished files
						if (!ksItemVal('finished')) {
							// file not finished yet
							all_knapsacks_finished = false;
							this_knapsack_finished = false;
							continue;
						} else if (ksItemVal('finalized')) {
							continue;
						} else {
							// file finished
							ksItemVal('finalized') = true;

							// UPDATE THE PROGRESS BAR not for each file
							finished_bytes_so_far += ksItemVal('filesize');
							userAborted = updateProgressBar(progbar, tsStart, ksItemVal('filename'), finished_bytes_so_far, selectedItemsSize, formattedMax, unitMax);
							if (userAborted) { break unfinished; }
						}
					}
					if (this_knapsack_finished) ks['finished'] = true;
				}
			}
			logger.force(sprintf('%s -- totalbytes: %d, selected_bytes_cnt: %d', fnName, finished_bytes_so_far, selectedItemsSize));
			logger.force(sprintf('%s -- all_finished: %b', fnName, all_knapsacks_finished));

			logger.force(stopwatch.stopAndPrint(fnName, 'Progress Bar'));
		}


		// LAST CLEANUP ACTIONS
		{
			DOpus.Delay(10);
			finalizeProgressBar(progbar);
			var tsFinish = getTS();
			// following is only for cosmetical reasons
			// wait for DOpus to output the last 'Script Completed' lines
			// otherwise DOpus might show a 'Script Completed' in the middle of our outputs below
			DOpus.Delay(500);
			// DOpus.ClearOutput();
		}


		// PREPARE RESULTS OBJECT
		// results ready, all threads finished/timed out
		// put everything neatly into an object
		var actionResults = buildActionResultsObject(fnName, selectedKnapsacked, tp, userAborted, tsStart, tsFinish, selectedItemsCount, selectedItemsSize);

		// if a collection name is set, we only need to show the selection & filtering results
		if (actionResults.errors.length) {
			collectionName = COLLECTION_FOR_ERRORS;
			util.cmd.RunCommand('CreateFolder "coll://' + collectionName + '"');
			util.cmd.RunCommand('Go "coll://' + collectionName + '" NEWTAB=findexisting');
			util.cmd.RunCommand('Select ALL');
			util.cmd.RunCommand('Delete REMOVECOLLECTION');
			util.cmd.ClearFiles();
			for (var i = 0; i < actionResults.errors.length; i++) {
				util.cmd.AddFile(DOpus.FSUtil.GetItem(actionResults.errors[i]));
			}
			util.cmd.RunCommand('Copy COPYTOCOLL=member FILE TO "coll://' + collectionName + '"');
		}


		// FROM THIS POINT ON, DO WHAT YOU WANT...
		{
			if (DUMP_DETAILED_RESULTS) dumpDetailedResultsToDOPusOutput(actionResults);
			var summaryAndErrorTexts = buildSummaryAndErrorTexts(actionResults);
			logger.force(summaryAndErrorTexts.summaryText);
			logger.force(summaryAndErrorTexts.errorsText);
			if (SHOW_SUMMARY_DIALOG) {
				// show an overall summary message as dialog if you like
				showMessageDialog(
					doh.getDialog(cmdData),
					summaryAndErrorTexts.summaryText.replace(/, /mg, '\n').replace(fnName + ' ', ''),
					Global.SCRIPT_NAME + ' - Results');
			}
		}

	}

	/**
	 * filespath
	 * @param {array} filepathsArray JS array, e.g. results after filtering, line item objects must at least have 'path' attribute
	 * @param {string} collectionName collection name to add to
	 * @returns nothing
	 */
	function addFilesToCollection(filepathsArray, collectionName) {
		util.cmd.RunCommand('CreateFolder "coll://' + collectionName + '"');
		util.cmd.RunCommand('Go "coll://' + collectionName + '" NEWTAB=findexisting');
		util.cmd.RunCommand('Select ALL');
		util.cmd.RunCommand('Delete REMOVECOLLECTION');
		util.cmd.ClearFiles();
		for (var i = 0; i < filepathsArray.length; i++) {
			util.cmd.AddFile(DOpus.FSUtil.GetItem(filepathsArray[i]['path']));
		}
		util.cmd.RunCommand('Copy COPYTOCOLL=member FILE TO "coll://' + collectionName + '"');
	}

	/**
	 * @param {object} cmdData DOpus command data
	 * @returns {POJO} validated parameters object with attribs: maxcount, maxwait, recurse...
	 */
	function validateManagerParameters(cmdData) {
		// maxwait will not be needed for this script at all
		// but if I use this script for webpage fetch or alike it will come handy
		var param = {
			maxcount               : cmdData.func.args.MAXCOUNT,          // maxiumum number of threads, default: all available
			maxwait                : cmdData.func.args.MAXWAIT,           // maximum wait in millisecs for a thread to finish
			recurse                : cmdData.func.args.got_arg.RECURSE,   // true: if dirs are selected process files under them, false: skip dirs
			calculation_simulation : cmdData.func.args.got_arg.CALCULATION_SIMULATION,
			hard_update_ads        : cmdData.func.args.got_arg.HARD_UPDATE_ADS,
			verify_from_ads        : cmdData.func.args.got_arg.VERIFY_FROM_ADS,
			smart_update_ads       : cmdData.func.args.got_arg.SMART_UPDATE_ADS,
			delete_ads             : cmdData.func.args.got_arg.DELETE_ADS,
			find_dirty             : cmdData.func.args.got_arg.FIND_DIRTY,
			find_missing           : cmdData.func.args.got_arg.FIND_MISSING,
			copy_to_clipboard      : cmdData.func.args.got_arg.COPY_TO_CLIPBOARD,
			export_to_file         : cmdData.func.args.got_arg.EXPORT_TO_FILE,
			import_from_file       : cmdData.func.args.got_arg.IMPORT_FROM_FILE,
			verify_from_file       : cmdData.func.args.got_arg.VERIFY_FROM_FILE,
		}
		if (!param.recurse)  param.recurse  = true;
		if (!param.maxcount) param.maxcount = MAX_AVAILABLE_CORE_COUNT;
		if (!param.maxwait)  param.maxwait  = 60*60*1000; // if no max wait given use 1 hour in millisecs
		if (   param.calculation_simulation
			|| param.hard_update_ads
			|| param.verify_from_ads
			|| param.smart_update_ads
			|| param.delete_ads
			|| param.find_dirty
			|| param.find_missing
			|| param.copy_to_clipboard
			|| param.export_to_file
			|| param.import_from_file
			|| param.verify_from_file
			) {
				return param;
		}

		abortWithFatalError(sprintf('%s -- No valid command is given invalid: %s', fnName, JSON.stringify(param, null, '\t')));
	}


	/**
	 * @param {string} fnCallerName caller function's name
	 * @param {array} selectedKnapsacked knapsacked items list
	 * @param {object} tp Thread Pool object
	 * @param {boolean} userAborted if user has aborted during action
	 * @param {integer} tsStart start timestamp
	 * @param {integer} tsFinish finish timestamp
	 * @param {integer} selectedItemsCount selected items count
	 * @param {integer} selectedItemsSize selected items size
	 * @returns {POJO} action results object
	 */
	function buildActionResultsObject(fnCallerName, selectedKnapsacked, tp, userAborted, tsStart, tsFinish, selectedItemsCount, selectedItemsSize) {
		var fnName = funcNameExtractor(buildActionResultsObject);

		logger.force(stopwatch.startAndPrint(fnName, 'Output preparation'));

		var outObj = {
				summary: {},
				items: {},
				errors: [],
			},
			timeoutsCnt      = 0,
			filesWithErrors  = [],
			unfinishedCnt    = 0,
			maxElapsedFile   = 0,
			maxElapsedThread = 0,
			longestFileName  = '',
			longestFileSize  = 0;
		// a threadID points to 1 knapsack
		knapsacks: for (var ki = 0; ki < selectedKnapsacked.knapsacks.length; ki++) {
			var ksMap = tp(selectedKnapsacked.knapsacks[ki]['threadID']);
			// each knapsack contains a map of files (also maps)
			var elapsedThread = 0;
			files: for (var eKS = new Enumerator(ksMap); !eKS.atEnd(); eKS.moveNext()) {
				var fileFullpath = eKS.item(),
					fileAttribs  = ksMap(fileFullpath);
				outObj.items[fileFullpath] = {
					maxwait  : fileAttribs('maxwait'),
					filename : fileAttribs('filename'),
					filepath : fileAttribs('filepath'),
					filesize : fileAttribs('filesize'),
					finished : fileAttribs('finished'),
					elapsed  : fileAttribs('elapsed'),
					timeout  : fileAttribs('timeout'),
					error    : fileAttribs('error'),
					result   : fileAttribs('result'),
					finalized: fileAttribs('finalized'),
				};
				if (outObj.items[fileFullpath]['elapsed'] > maxElapsedFile) {
					maxElapsedFile  = outObj.items[fileFullpath]['elapsed'];
					longestFileName = outObj.items[fileFullpath]['filename'];
					longestFileSize = outObj.items[fileFullpath]['filesize'];
				}
				elapsedThread += outObj.items[fileFullpath]['elapsed'];

				if (!userAborted && !outObj.items[fileFullpath]['finished']) {
					logger.force('unfinished file: ' + fileFullpath);
					++unfinishedCnt;
				}
				if (outObj.items[fileFullpath]['timeout']) {
					++timeoutsCnt;
				}
				if (outObj.items[fileFullpath]['error']) {
					filesWithErrors.push(fileFullpath);
				}
			} // files in the knapsack
			if (elapsedThread > maxElapsedThread) {
				maxElapsedThread = elapsedThread;
			}
		} // knapsack

		outObj.summary = {
			myname          : fnCallerName,
			tsstart         : tsStart,
			tsfinish        : tsFinish,
			aborted         : userAborted,
			totalelapsed    : tsFinish - tsStart,
			maxelapsedfile  : maxElapsedFile,
			maxelapsedthread: maxElapsedThread,
			longestfilename : longestFileName,
			longestfilesize : longestFileSize,
			timeouts        : timeoutsCnt,
			errors          : filesWithErrors.length,
			unfinished      : unfinishedCnt,
			totalfiles      : selectedItemsCount || 0,
			totalsize       : selectedItemsSize || 0,
			avgspeed        : selectedItemsSize * 1000 / (tsFinish - tsStart) || 0 // we calculate speed per second
		};
		outObj.errors = filesWithErrors;

		logger.force(stopwatch.stopAndPrint(fnName, 'Output preparation'));
		return outObj;
	}

	/**
	 * @param {POJO} actionResultsObject action results object
	 * @returns {POJO} object with attribs: summaryText & errorsText
	 */
	function buildSummaryAndErrorTexts(actionResultsObject) {
		var summaryText = sprintf(
			'\n====  %s SUMMARY  ====\n%s\nStart: %s\nFinish: %s\n'
			+ '%s' // show aborted only if necessary
			+ 'Timeouts: %d\nUnfinished: %d\nErrors: %d\n'
			+ 'Max Elapsed/Thread: %d ms (%s s)\nMax Elapsed/File: %d ms (%s s)\n'
			+ 'Max Elapsed for File Name: %s\nMax Elapsed for File Size: %d (%s)\n'
			+ '\n\nTotal Files after Filtering: %d\n\nTotal Size after Filtering: %s bytes (%s)\n\nTotal Elapsed: %d ms (%s s)\n\nAverage Speed: %s/s',
			actionResultsObject.summary.myname,
			(actionResultsObject.summary.errors ? '\nSOME ERRORS OCCURRED\n' : ''),
			actionResultsObject.summary.tsstart.formatAsHms(),
			actionResultsObject.summary.tsfinish.formatAsHms(),
			actionResultsObject.summary.aborted ? 'Aborted: Yes\n' : '',
			actionResultsObject.summary.timeouts,
			actionResultsObject.summary.unfinished,
			actionResultsObject.summary.errors,
			actionResultsObject.summary.maxelapsedthread,
			actionResultsObject.summary.maxelapsedthread.formatAsDuration(),
			actionResultsObject.summary.maxelapsedfile,
			actionResultsObject.summary.maxelapsedfile.formatAsDuration(),
			actionResultsObject.summary.longestfilename,
			actionResultsObject.summary.longestfilesize,
			actionResultsObject.summary.longestfilesize.formatAsSize(),
			actionResultsObject.summary.totalfiles,
			actionResultsObject.summary.totalsize,
			actionResultsObject.summary.totalsize.formatAsSize(),
			actionResultsObject.summary.totalelapsed,
			actionResultsObject.summary.totalelapsed.formatAsDuration(),
			actionResultsObject.summary.avgspeed.formatAsSize()
		);
		if (actionResultsObject.	errors.length) {
			var errorsText = '\nFiles with errors:\n';
			for (var i = 0; i < actionResultsObject.errors.length; i++) {
				errorsText += '\t' + actionResultsObject.errors[i] + '\n';
			}
			errorsText += '\n\n';
		}
		return { summaryText: summaryText, errorsText: errorsText||'' };
	}

	/**
	 * @param {POJO} actionResultsObject action results object
	 * @returns nothing
	 */
	function dumpDetailedResultsToDOPusOutput(actionResultsObject) {
		var fnName = funcNameExtractor(dumpDetailedResultsToDOPusOutput);
		for (f in actionResultsObject.items) {
			var el = actionResultsObject.items[f];
			var itemSummaryMsg = sprintf(
				'%s -- Worker finished: %s, timeout: %s, size: %10d, elapsed: %7d ms, file: %s, %s',
				fnName,
				el.finished,
				el.timeout,
				el.filesize,
				el.elapsed,
				el.filepath,
				el.result ? 'Result: ' + el.result : 'Error: ' + el.error
			);
			logger.warn(itemSummaryMsg);
		}
		logger.warn('');
		logger.warn('');
		logger.warn('');
		logger.warn('');
		logger.warn('');
	}


}

/*
	888       888  .d88888b.  8888888b.  888    d8P  8888888888 8888888b.
	888   o   888 d88P" "Y88b 888   Y88b 888   d8P   888        888   Y88b
	888  d8b  888 888     888 888    888 888  d8P    888        888    888
	888 d888b 888 888     888 888   d88P 888d88K     8888888    888   d88P
	888d88888b888 888     888 8888888P"  8888888b    888        8888888P"
	88888P Y88888 888     888 888 T88b   888  Y88b   888        888 T88b
	8888P   Y8888 Y88b. .d88P 888  T88b  888   Y88b  888        888  T88b
	888P     Y888  "Y88888P"  888   T88b 888    Y88b 8888888888 888   T88b
*/
{
	function __WORKER__(){}
	// called by onDOpusCmdMTHManager - do not call directly
	function onDOpusCmdMTHWorker(cmdData) {
		var fnName = funcNameExtractor(onDOpusCmdMTHWorker);

		var param = {};
		param.threadID   = cmdData.func.args.THREADID;
		param.maxwait    = cmdData.func.args.MAXWAIT;
		param.actionfunc = cmdData.func.args.ACTIONFUNC;

		logger.normal(stopwatch.startAndPrint(fnName, '', sprintf('threadID %s, maxwait: %d, action: %s', param.threadID, param.maxwait, param.actionfunc) ));

		// convert function name to function
		param.actionfunc = actions.getFunc(param.actionfunc);

		// check the thread pool
		var tp = util.sv.Get('TP');
		if(!tp(param.threadID)) {
			throw new Error('TODO - ADJUST');
		}

		// variable to query if user has aborted via progress bar or not
		var aborted = false;

		var ksMap = tp(param.threadID);
		filesloop: for (var cnt = 0, e = new Enumerator(ksMap); !e.atEnd(); ++cnt, e.moveNext()) {
			var ksItemKey = e.item();         // full path is the key, as we put it in the manager
			var ksItemVal = ksMap(ksItemKey); // map with: maxwait, filename, filepath, filesize, finished, elapsed, timeout, error, result
			logger.verbose(sprintf('%s -- ksItemKey: %s, ksItemVal.name: %s, ksItemVal.size: %10d', fnName, ksItemKey, ksItemVal('filename'), ksItemVal('filesize') ));

			// if the manager sets the pause or abort status, honor it
			while(getPauseStatus() === true) {
				// already started hashing jobs won't be affected, obviously
				DOpus.Delay(500); // doesn't need to be too short, pause is pause
			}
			if (getAbortStatus() === true) {
				break filesloop;
			}
			// call the hash calculator
			stopwatch.start(fnName + ksItemKey);
			var oItem = DOpus.FSUtil.GetItem(ksItemVal('filepath'));
			var newHashResult = new Result(); // needed so that VSCode can auto-complete
			// newHashResult = (param.actionfunc)(oItem, null); // IMPORTANT: this is the heart of actions
			newHashResult = param.actionfunc.call(param.actionfunc, oItem, null); // IMPORTANT: this is the heart of actions
			var elapsed = stopwatch.stop(fnName + ksItemKey);

			// put the results back to TP
			ksItemVal('finished') = true;
			ksItemVal('elapsed')  = elapsed;
			if (newHashResult.isOK()) {
				ksItemVal('result') = newHashResult.ok;
				ksItemVal('error')  = false;
			} else {
				ksItemVal('result') = false;
				ksItemVal('error')  = newHashResult.err;
			}
			tp(param.threadID)(ksItemKey) = ksItemVal;
		}
		logger.normal(stopwatch.stopAndPrint(fnName, '', sprintf('threadID: %s, items: %s, aborted: %b', param.threadID, cnt, aborted)));
	}
}

/**
	8888888888 8888888 888    88888888888 8888888888 8888888b.  8888888 888b    888  .d8888b.
	888          888   888        888     888        888   Y88b   888   8888b   888 d88P  Y88b
	888          888   888        888     888        888    888   888   88888b  888 888    888
	8888888      888   888        888     8888888    888   d88P   888   888Y88b 888 888
	888          888   888        888     888        8888888P"    888   888 Y88b888 888  88888
	888          888   888        888     888        888 T88b     888   888  Y88888 888    888
	888          888   888        888     888        888  T88b    888   888   Y8888 Y88b  d88P
	888        8888888 88888888   888     8888888888 888   T88b 8888888 888    Y888  "Y8888P88
*/
{
	function __FILTERING__(){}
	/**
	 * 	output structure
	 * 	{
	 * 		totalsize: number of bytes,
	 * 		items: array of [ { 'path': string, 'name': string, 'size': number }, ... ]
	 * 	}
	 *
	 * @param {DOpus object} enumerableItems enumerable items, e.g. scriptCmdData.func.sourcetab.selected
	 * @param {boolean} recurse process subdirs
	 * @param {function} fnItemFilter function to select only certain items
	 * @returns {POJO} filtered items
	 */
	function applyFilterToSelectedItems(enumerableItems, recurse, fnItemFilter) {
		var fnName = funcNameExtractor(applyFilterToSelectedItems);

		// these are needed to convert DOpus path and size to JS-compatible types
		var tempPath, tempName, tempSize;
		// max # of files directly in a subdir, acts also against infinite while-loop if enum.complete goes wrong
		var icnt, imax = 100000;
		// unfiltered & filtered list of DOpus Items
		var aItemsPreFilter = [], iItemsSizePreFilter = 0, aItemsResult = [], iItemsSizeResult = 0, aItemsSkipped = [];

		// PRESELECT ALL FILES
		{
			logger.normal(stopwatch.startAndPrint(fnName, 'File Selection'));
			// first collect all the path & size information for the selected items
			// note we pass an 'enumerableItems' which is most likely passed from scriptCmdData.func.sourcetab.selected
			for (var e = new Enumerator(enumerableItems); !e.atEnd(); e.moveNext()) {
				var selitem = e.item();

				if (selitem.is_reparse || selitem.is_junction || selitem.is_symlink) {
					// type: unsupported
					logger.force('Skipping unsupported item: ' + selitem.realpath);
					continue;
				} else if (selitem.is_dir && recurse) {
					// type: directory
					var fEnum = DOpus.FSUtil.ReadDir(selitem, recurse && 'r');
					if (fEnum.error) {
						logger.error('Cannot read dir: ' + fEnum.error); // TODO - error dialog?
						return;
					}
					icnt = 0; // just as a precation for while loop
					while (!fEnum.complete && ++icnt < imax) {
						var subitem = fEnum.next;
						if (subitem.is_dir || subitem.is_reparse || subitem.is_junction || subitem.is_symlink) continue;
						aItemsPreFilter.push(subitem);
						iItemsSizePreFilter += parseInt(subitem.size);
					}
					fEnum.Close();
				} else {
					// type: file
					aItemsPreFilter.push(selitem);
					iItemsSizePreFilter += parseInt(selitem.size);
				}
			}
			logger.normal(stopwatch.stopAndPrint(fnName, 'File Selection'));
		}


		// COLLECT FILES USING GIVEN FILTER
		// WARNING: fnItemFilter runs after all files are selected, not during the determination of files
		{
			logger.normal(stopwatch.startAndPrint(fnName, 'Filtering'));
			// apply filter to all candidates
			for (var i = 0; i < aItemsPreFilter.length; i++) {
				var selitem = aItemsPreFilter[i];
				tempPath = ''+selitem.realpath;
				tempName = ''+selitem.name;
				tempSize = parseInt(selitem.size);

				// filter out items with the given function
				// if (!(fnItemFilter)(selitem)) { // IMPORTANT: this is the heart of filters
				if (!(fnItemFilter.call(fnItemFilter, selitem))) { // IMPORTANT: this is the heart of filters
					logger.info(sprintf('%s -- Filtering out %s', fnName, tempName));
					aItemsSkipped.push({ path: tempPath, name: tempName, size: tempSize });
					continue;
				} else {
					aItemsResult.push({ path: tempPath, name: tempName, size: tempSize });
					iItemsSizeResult += tempSize;
				}
			}
			logger.normal(stopwatch.stopAndPrint(fnName, 'Filtering'));
			logger.normal('');
		}
		return { items: aItemsResult, totalsize: iItemsSizeResult, skipped: aItemsSkipped };
	}
}


/*
	888    d8P  888b    888        d8888 8888888b.   .d8888b.         d8888  .d8888b.  888    d8P  8888888 888b    888  .d8888b.
	888   d8P   8888b   888       d88888 888   Y88b d88P  Y88b       d88888 d88P  Y88b 888   d8P     888   8888b   888 d88P  Y88b
	888  d8P    88888b  888      d88P888 888    888 Y88b.           d88P888 888    888 888  d8P      888   88888b  888 888    888
	888d88K     888Y88b 888     d88P 888 888   d88P  "Y888b.       d88P 888 888        888d88K       888   888Y88b 888 888
	8888888b    888 Y88b888    d88P  888 8888888P"      "Y88b.    d88P  888 888        8888888b      888   888 Y88b888 888  88888
	888  Y88b   888  Y88888   d88P   888 888              "888   d88P   888 888    888 888  Y88b     888   888  Y88888 888    888
	888   Y88b  888   Y8888  d8888888888 888        Y88b  d88P  d8888888888 Y88b  d88P 888   Y88b    888   888   Y8888 Y88b  d88P
	888    Y88b 888    Y888 d88P     888 888         "Y8888P"  d88P     888  "Y8888P"  888    Y88b 8888888 888    Y888  "Y8888P88
*/
{
	function __KNAPSACKING__(){}
	/**
	 * output structure:
	 * {
	 *     count: number of knapsacks,
	 *     filescnt: number of files,
	 *     finished: boolean used by manager,
	 *     knapsacks: [
	 *         {
	 *             capacity: number of bytes in this knapsack,
	 *             items: [ { 'path': string, 'name': string, 'size': number }, ... ]
	 *         }, ...
	 *     ],
	 *     // the rest as in selectFilesWithFilter() output (except skipped)
	 *     totalsize: number of bytes,
	 *     items: array of [ { 'path': string, 'name': string, 'size': number }, ... ]
	 *     ...
	 * }
	 * @param {array} aItemsArray JS array, e.g. results after filtering
	 * @param {integer} iItemsSize total size of selected items
	 * @param {integer} numThreads maximum number of threads/knapsacks to use, default: all available cores
	 * @param {boolean} sortBySizeFirst sort file list by size, default {PROCESS_BIGGEST_FILES_FIRST}
	 * @returns {POJO} knapsacked items
	 */
	function knapsackItems(aItemsArray, iItemsSize, numThreads, sortBySizeFirst) {
		var fnName = funcNameExtractor(knapsackItems);

		logger.normal(stopwatch.startAndPrint(fnName, 'Knapsacking'));

		numThreads = typeof numThreads === 'number' & numThreads >= 1 ? numThreads : MAX_AVAILABLE_CORE_COUNT;

		// output POJO
		var outObj = {
			count    : 0,
			knapsacks: [],
			filescnt : aItemsArray.length,
			finished : false,
			totalsize: iItemsSize,
			items    : aItemsArray
		};

		// SPLIT FILES INTO KNAPSACKS
		logger.normal(stopwatch.startAndPrint(fnName + ' -- 1st Stage', sprintf('Count: %d, Size: %d, Num Threads: %d', outObj.filescnt, outObj.totalsize, numThreads)));
		{
			// now that we all file paths & sizes
			// we will distribute the files by their sizes
			// assuming average hashing speed by byte is more or less constant for small files and large files
			// i.e. a small knapsack with only few large files should ideally take the same amount of time
			// as a large knapsack with many small files as long as their total byte sizes are approximately the same
			//
			// afterwards each knapsack will be executed in a single-thread, as an array of files
			//
			// find out how many knapsacks at max we need
			// if we have less or equal files than available thread count we will create one knapsack for each file (#KS <= #CPU)
			// if we have more than available thread count we will create only so many knapsacks as available threads (#KS = #CPU)
			outObj['count'] = Math.min(outObj['filescnt'], numThreads);

			// we will not use a knapsack algorithm in the classical sense per se
			// since we do not have 2+ competing factors, but only 1: size, size, size! (that's still 1)
			// thus we will implement a cheapass knapsack algorithm but a very fast one to compute

			// calculate the ideal knapsack size
			var knapsackSize = Math.ceil(outObj['totalsize'] / outObj['count']);       // e.g. 24 MB over 24 threads = 1 MB... ideally!

			// at the very max each knapsack will have this many elements
			var knapsackMaxElements = Math.ceil(outObj['filescnt'] / outObj['count']); // e.g. 246 files over 24 threads = max 11 items per knapsack

			logger.force(sprintf('%s -- Ideal Knapsack Size: %d, Ideal Max Elements/Knapsack: %d', fnName, outObj['count'], knapsackSize, knapsackMaxElements));

			// initialize individual knapsacks
			for (var i = 0; i < outObj['count']; i++) {
				outObj['knapsacks'].push({ 'capacity': 0, 'items': [] });
			}

			if (sortBySizeFirst) {
				// sort the files by descending size - note that the array is sorted in place, and no copy is made
				outObj['items'].sort(function(a, b){
					return b.size - a.size; // sort descending
				});
			}

			// start allocating files to knapsacks
			knapsackAllocLoop: for (var i = 0; i < outObj['items'].length; i++) {
				// find a suitable knapsack, i.e. if we put this file it should not exceed the avarage capacity
				// note that here we loop over the knapsacks sequentially and by the sizes sorted large to small
				// that means:
				// 1. the higher knapsacks (with lower index) will always get the largest files
				// 2. if the bottom knapsacks have all free capacity for incoming files
				//    the ones with lower index among them will always get the incoming file
				//    so it is perfectly possible that some knapsacks will be empty at the end
				// ...and this is why this is a cheapass pseudo-knapsack implementation, but it's faaaast AF!
				//
				// under certain conditions the knapsacks could be filled very unevenly
				// at worst, NUM_THREADS-1 larger than average files will end up in their own solitary knapsacks with only 1 element
				// and the rest of smaller files will end up, crammed into the other half of knapsacks
				// but of course due to the nature of that most consumer, if not all to my knowledge, hashing algorithms work single-threaded
				// not even multi-threading will help you when you have to at the very least wait for the longest running thread
				//
				// now you know

				// logger.force(sprintf('%s -- Searching a home for %s, size: %s, max KS capacity: %s', fnName, allObjBySize[i]['path'], allObjBySize[i]['size'], knapsackSize ));
				for (var ks = 0; ks < outObj['count']; ks++) {
					if (outObj['knapsacks'][ks]['capacity'] + outObj['items'][i]['size'] <= knapsackSize) {
						outObj['knapsacks'][ks]['items'].push(outObj['items'][i]);
						outObj['knapsacks'][ks]['capacity'] += outObj['items'][i]['size'];
						// logger.force(sprintf('%s -- Found a home for file: %s, size: %d', fnName, allObjBySize[i]['path'], allObjBySize[i]['size']));
						continue knapsackAllocLoop; // we found a home continue with next file
					}
				}

				// file did not fit into any knapsack
				// if a file size is larger than ideal capacity, we put it into first knapsack with least items
				var minimumItemsFound = knapsackMaxElements;
				var minimumFilledKnapsackNumber = -1;
				for (var ks = 0; ks < outObj['count']; ks++) {
					// logger.force(sprintf('%s -- index: %d, outObj['knapsacks'][ks].items.length: %d, knapsackMaxElements: %d', fnName, ks, outObj['knapsacks'][ks]['items'].length, knapsackMaxElements));
					if (outObj['knapsacks'][ks]['items'].length < minimumItemsFound){
						minimumItemsFound = outObj['knapsacks'][ks]['items'].length;
						minimumFilledKnapsackNumber = ks;
					}
				}
				if (minimumFilledKnapsackNumber != -1) {
					outObj['knapsacks'][minimumFilledKnapsackNumber]['items'].push(outObj['items'][i]);
					outObj['knapsacks'][minimumFilledKnapsackNumber]['capacity'] += outObj['items'][i]['size'];
				} else {
					var msg = sprintf('%s -- THIS SHOULD HAVE NEVER HAPPENED - Found no home for file: %s, size: %d', fnName, outObj['items'][i]['path'], outObj['items'][i]['size']);
					logger.force(msg);
					throw new Error(msg);
				}
			}
		}
		logger.normal(stopwatch.stopAndPrint(fnName + ' -- 1st Stage'));


		// OPTIONAL - avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack
		logger.normal(stopwatch.startAndPrint(fnName + ' -- 2nd Stage', sprintf('Count: %d, Size: %d, Num Threads: %d', outObj.filescnt, outObj.totalsize, numThreads)));
		{
			if (AVOID_OVERFILLED_KNAPSACKS) {
				// optional: avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack, because of 1 other over-limit knapsack
				// this does not reduce the file size in this knapsack much, but the file count noticably
				// and might help reduce the file access time overhead in this thread
				// the Robin Hood algorithm!
				var underfilledKS = -1;
				while(underfilledKS === -1) {
					var overfilledKS = -1, currentMax = -1;
					for (var ks = 0; ks < outObj['count']; ks++) {
						if (currentMax < outObj['knapsacks'][ks]['items'].length && outObj['knapsacks'][ks]['capacity'] <= knapsackSize ) {
							currentMax = outObj['knapsacks'][ks]['items'].length;
							overfilledKS = ks;
						}
						if (outObj['knapsacks'][ks]['items'].length === 0) {
							underfilledKS = ks;
						}
					}
					if (overfilledKS !== -1 && underfilledKS !== -1) {
						logger.info(sprintf('%s -- Overfilled & underfilled found - Overfilled (%d) count before: %d , Underfilled (%d) count before: %d', fnName, overfilledKS, outObj['knapsacks'][overfilledKS]['items'].length , underfilledKS, outObj['knapsacks'][underfilledKS]['items'].length));
						// arrDeletedItems = arr.splice(start[, deleteCount[, item1[, item2[, ...]]]])
						// move items from overfilled to underfilled
						outObj['knapsacks'][underfilledKS]['items'] = outObj['knapsacks'][overfilledKS]['items'].splice(0, Math.round(outObj['knapsacks'][overfilledKS]['items'].length / 2) );
						logger.info(sprintf('%s -- Overfilled & underfilled found - Overfilled (%d) count after: %d , Underfilled (%d) count after: %d', fnName, overfilledKS, outObj['knapsacks'][overfilledKS]['items'].length , underfilledKS, outObj['knapsacks'][underfilledKS]['items'].length));

						// update the capacities
						outObj['knapsacks'][overfilledKS]['capacity']  = 0;
						for (var i = 0; i < outObj['knapsacks'][overfilledKS]['items'].length; i++) {
							outObj['knapsacks'][overfilledKS]['capacity'] += outObj['knapsacks'][overfilledKS]['items'][i]['size'];
						}
						outObj['knapsacks'][underfilledKS]['capacity'] = 0;
						for (var i = 0; i < outObj['knapsacks'][underfilledKS]['items'].length; i++) {
							outObj['knapsacks'][underfilledKS]['capacity'] += outObj['knapsacks'][underfilledKS]['items'][i]['size'];
						}
					}
					underfilledKS = 0;
					for (var ks = 0; ks < outObj['count']; ks++) {
						if (outObj['knapsacks'][ks]['items'].length === 0) {
							underfilledKS = -1;
						}
					}
				}
			}
		}
		logger.normal(stopwatch.stopAndPrint(fnName + ' -- 2nd Stage'));


		// SANITY CHECK - NO FILE GETS LEFT BEHIND!
		{
			var totalKSItemsCount = 0, totalKSItemsSize = 0;
			for (var ks = 0; ks < outObj['count']; ks++) {
				totalKSItemsCount += outObj['knapsacks'][ks]['items'].length;
				totalKSItemsSize  += outObj['knapsacks'][ks]['capacity'];
				logger.info(sprintf('%s -- Knapsack #%d, capacity: %d, length: %d', fnName, ks, outObj['knapsacks'][ks]['capacity'], outObj['knapsacks'][ks]['items'].length));
			}
			if (totalKSItemsCount !== outObj['filescnt'] || totalKSItemsSize !== outObj['totalsize']) {
				var msg = sprintf('%s -- Some items could not be placed in knapsacks - Total: %d, Placed: %d, Total Size: %d, Placed Size: %d', fnName, outObj['filescnt'], totalKSItemsCount, outObj['totalsize'], totalKSItemsSize);
				abortWithFatalError(msg);
			}
		}

		logger.normal(stopwatch.stopAndPrint(fnName, 'Knapsacking', 'Integrity check passed'));

		// for debugging do not JSON.stringify the whole object, if you select, 1000+ files, a gigantic array might be too much
		// logger.force(JSON.stringify(outObj['knapsacks'], null, 4));
		// try this instead
		// for (var ks = 0; ks < outObj['count']; ks++) { logger.force('Knapsack #' + ks + '\n\n' + JSON.stringify(outObj['knapsacks'][ks], null, 4)); }
		return outObj;
	}
}


/*
	8888888888  .d88888b.  8888888b.  888b     d888        d8888 88888888888 88888888888 8888888888 8888888b.   .d8888b.
	888        d88P" "Y88b 888   Y88b 8888b   d8888       d88888     888         888     888        888   Y88b d88P  Y88b
	888        888     888 888    888 88888b.d88888      d88P888     888         888     888        888    888 Y88b.
	8888888    888     888 888   d88P 888Y88888P888     d88P 888     888         888     8888888    888   d88P  "Y888b.
	888        888     888 8888888P"  888 Y888P 888    d88P  888     888         888     888        8888888P"      "Y88b.
	888        888     888 888 T88b   888  Y8P  888   d88P   888     888         888     888        888 T88b         "888
	888        Y88b. .d88P 888  T88b  888   "   888  d8888888888     888         888     888        888  T88b  Y88b  d88P
	888         "Y88888P"  888   T88b 888       888 d88P     888     888         888     8888888888 888   T88b  "Y8888P"
*/
{
	function __FORMATTERS__(){}
	// turns 2^10 to "KB", 2^20 to "MB" and so on
	Number.prototype.getUnit = (function() {
		var units = {
			B : [ 'B', 0],
			KB: [ 'KB', Math.pow(2, 10)],
			MB: [ 'MB', Math.pow(2, 20)],
			GB: [ 'GB', Math.pow(2, 30)],
			TB: [ 'TB', Math.pow(2, 40)],
			PB: [ 'TB', Math.pow(2, 50)]
		};
		return function() {
			if      (this >= units.PB[1]) return units.PB;
			else if (this >= units.TB[1]) return units.TB;
			else if (this >= units.GB[1]) return units.GB;
			else if (this >= units.MB[1]) return units.MB;
			else if (this >= units.KB[1]) return units.KB;
			else                          return units.B;
		}
	}());
	// turns 2^10 to "1.0 KB", 2^20 to "1.0 MB" and so on
	Number.prototype.formatAsSize = function(unit, decimal) {
		if (this === 0) {
			return '';
		}
		if (typeof unit === 'undefined' || !unit.length) {
			unit = this.getUnit(this);
		}
		if (typeof decimal !== 'number') {
			decimal = 2;
		}
		return (this / unit[1]).toFixed(decimal) + ' ' + unit[0];
	};
	// turns milliseconds to rounded seconds
	Number.prototype.formatAsDuration = function() {
		return (this/1000).toFixed(1);
	};
	// converts timestamps to time format
	Number.prototype.formatAsHms = function() {
		// "18:24:16"
		return new Date(this).toTimeString().substr(0,8);
	}
	// turns timestamp to ISO "2021-01-19T18:24:16.123Z" format
	Number.prototype.formatAsDateISO = function() {
		// "2021-01-19T18:24:16.123Z"
		var oDate    = new Date(this);
		var vYear    = oDate.getUTCFullYear();
		var vMonth   = (1 + oDate.getUTCMonth()).toString();  if (vMonth.length == 1) { vMonth = '0' + vMonth; }
		var vDay     = oDate.getUTCDate().toString();         if (vDay.length == 1) { vDay = '0' + vDay; }
		var vHours   = oDate.getUTCHours().toString();        if (vHours.length == 1) { vHours = '0' + vHours; }
		var vMinutes = oDate.getUTCMinutes().toString();      if (vMinutes.length == 1) { vMinutes = '0' + vMinutes; }
		var vSeconds = oDate.getUTCSeconds().toString();      if (vSeconds.length == 1) { vSeconds = '0' + vSeconds; }
		var vMilliS  = (oDate.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5);
		return '' + vYear + '-' + vMonth + '-' + vDay + ' T' + vHours + ':' + vMinutes + ':' + vSeconds + '.' + vMilliS + 'Z';
	};
	// turns timestamp to ISO like "20210119-182416" format
	Number.prototype.formatAsDateTimeCompact = function() {
		// "20210119-182416"
		var oDate    = new Date(this);
		var vYear    = oDate.getFullYear();
		var vMonth   = (1 + oDate.getMonth()).toString(); if (vMonth.length == 1) { vMonth = '0' + vMonth; }
		var vDay     = oDate.getDate().toString();        if (vDay.length == 1) { vDay = '0' + vDay; }
		var vHours   = oDate.getHours().toString();       if (vHours.length == 1) { vHours = '0' + vHours; }
		var vMinutes = oDate.getMinutes().toString();     if (vMinutes.length == 1) { vMinutes = '0' + vMinutes; }
		var vSeconds = oDate.getSeconds().toString();     if (vSeconds.length == 1) { vSeconds = '0' + vSeconds; }
		return '' + vYear + vMonth + vDay + '-' + vHours + vMinutes + vSeconds;
		// JScript does not have toISOString() :/
		return (new Date(this).toISOString()).replace(/[:-]/g, '').replace(/\..+$/, '').replace('T', '-');
	}
	// turns timestamp to DOpus "D2021-01-19 T18:24:16" format
	Number.prototype.formatAsDateDOpus = function() {
		// "20210119-182416"
		var oDate    = new Date(this);
		var vYear    = oDate.getFullYear();
		var vMonth   = (1 + oDate.getMonth()).toString(); if (vMonth.length == 1) { vMonth = '0' + vMonth; }
		var vDay     = oDate.getDate().toString();        if (vDay.length == 1) { vDay = '0' + vDay; }
		var vHours   = oDate.getHours().toString();       if (vHours.length == 1) { vHours = '0' + vHours; }
		var vMinutes = oDate.getMinutes().toString();     if (vMinutes.length == 1) { vMinutes = '0' + vMinutes; }
		var vSeconds = oDate.getSeconds().toString();     if (vSeconds.length == 1) { vSeconds = '0' + vSeconds; }
		return 'D' + vYear + '-' + vMonth + '-' + vDay + ' T' + vHours + ':' + vMinutes + ':' + vSeconds;
	}
	// Date formatter for "SetAttr META lastmodifieddate..."
	// D2021-01-19 T18:24:16
	function DateToDOpusFormat(oItemDate) {
		return DOpus.Create.Date(oItemDate).Format("D#yyyy-MM-dd T#HH:mm:ss");
	}
}


/*
	888       .d88888b.   .d8888b.   .d8888b.  8888888888 8888888b.
	888      d88P" "Y88b d88P  Y88b d88P  Y88b 888        888   Y88b
	888      888     888 888    888 888    888 888        888    888
	888      888     888 888        888        8888888    888   d88P
	888      888     888 888  88888 888  88888 888        8888888P"
	888      888     888 888    888 888    888 888        888 T88b
	888      Y88b. .d88P Y88b  d88P Y88b  d88P 888        888  T88b
	88888888  "Y88888P"   "Y8888P88  "Y8888P88 8888888888 888   T88b
*/
{
	// LOGGER object
	function __LOGGER__(){}
	var logger = (function() {
		var VALID_LEVELS = {
			NONE:    0,
			ERROR:   1,
			WARN:    2,
			NORMAL:  3,
			INFO:    4,
			VERBOSE: 5
		}
		var _level = VALID_LEVELS.NORMAL;
		function _setLevel (level) {
			_level = typeof level === 'number' && level >= VALID_LEVELS.NONE && level <= VALID_LEVELS.VERBOSE ? level : _level; // if valid use new, if not use old
			if (typeof config !== 'undefined' && config.exists('DEBUG_LEVEL')) {
				config.set('DEBUG_LEVEL', _level);
			}
		}
		function _getLevel() {
			if (typeof _level === 'undefined') {
				if (typeof config !== 'undefined' && config.exists('DEBUG_LEVEL')) {
					var cl = config.get('DEBUG_LEVEL');
					if (cl !== _level) { _level = cl }
				} else {
					_level = VALID_LEVELS.ERROR;
				}
			}
			return _level;
		}
		function _baseout(message, level) {
			if (level <= _level) DOpus.Output(message);
		}
		return {
			levels: VALID_LEVELS,

			force: function (message) {
				_baseout(message, -1);
			},
			error: function (message) {
				_baseout(message, this.levels.ERROR);
			},
			warn: function (message) {
				_baseout(message, this.levels.WARN);
			},
			normal: function (message) {
				_baseout(message, this.levels.NORMAL);
			},
			info: function (message) {
				_baseout(message, this.levels.INFO);
			},
			verbose: function (message) {
				_baseout(message, this.levels.VERBOSE);
			},
			setLevel: function (level) {
				_setLevel(level);
			},
			getLevel: function () {
				return _getLevel();
			},
			getKeys: function () {
				var keys = [];
				for (k in this.levels) {
					if (this.levels.hasOwnProperty(k)) {
						keys.push(k);
					}
				}
				return keys;
			}
		}
	}());
}


/*
	8888888888 8888888 888      8888888888            d8888  .d8888b.   .d8888b.  8888888888  .d8888b.   .d8888b.
	888          888   888      888                  d88888 d88P  Y88b d88P  Y88b 888        d88P  Y88b d88P  Y88b
	888          888   888      888                 d88P888 888    888 888    888 888        Y88b.      Y88b.
	8888888      888   888      8888888            d88P 888 888        888        8888888     "Y888b.    "Y888b.
	888          888   888      888               d88P  888 888        888        888            "Y88b.     "Y88b.
	888          888   888      888              d88P   888 888    888 888    888 888              "888       "888
	888          888   888      888             d8888888888 Y88b  d88P Y88b  d88P 888        Y88b  d88P Y88b  d88P
	888        8888888 88888888 8888888888     d88P     888  "Y8888P"   "Y8888P"  8888888888  "Y8888P"   "Y8888P"
*/
{
	function __FILE_ACCESS__(){}
	/**
	 * reads requested file contents (incl. ADS streams)
	 * @param {string} path file path to read
	 * @param {TEXT_ENCODING} format {TEXT_ENCODING.utf8} or {TEXT_ENCODING.utf16}
	 * @returns {string|boolean} file contents, false on error
	 * @see TEXT_ENCODING
	 */
	function ReadFile(path, format) {
		// path, use "Y:\\Path\\file.txt" or "Y:\\Path\\file.txt:CustomMetaInfo" for ADS
		// format: "base64", "quoted", "auto"=not supplied, "utf-8", "utf-16", "utf-16-le", "utf-16-be"
		// the only ones which worked reliably in my tests are utf-8 & utf-16, since they're the only ones Blob.CopyFrom() supports
		// use only one of encoding.utf8 or encoding.utf16
		//
		// res = ReadFile("Y:\\MediaInfo\\victim.txt:SecondStream", encoding.utf8);
		// res = ReadFile("Y:\\MediaInfo\\victim.txt", encoding.utf16);
		var res = false;
		format = format === TEXT_ENCODING.utf16 ? 'utf-16' : 'utf-8';

		if (!DOpus.FSUtil.Exists(path)) { return res; }

		var fh = DOpus.FSUtil.OpenFile(path); // default read mode
		if(fh.error !== 0) {
			// if you enable this log level in the global options you will receive a lot of messages for missing streams of unprocessed files
			logger.normal(path + ', error occurred while opening file: ' + fh.error);
		} else {
			try {
				var blob = fh.Read(	);
				logger.verbose('blob size: ' + blob.size + ', type: ' + typeof blob);
				try {
					res = util.st.Decode(blob, format); // "utf-8" seems to be standard, "auto" does not work for me
					logger.verbose('blob -- type: ' + typeof res + ', size: ' + res.length + "\n" + res);
				} catch(e) { logger.error(path + ', st.decode: ' + e.description); }
				blob.Free();
			} catch(e) { logger.error(path + ', fh.read: ' + e.description); }
		}
		fh.Close();
		return res;
	}
	/**
	 * saves given contents to file (incl. ADS streams)
	 * @param {string} path file path to save
	 * @param {*} contents contents
	 * @param {TEXT_ENCODING} format {TEXT_ENCODING.utf8} or {TEXT_ENCODING.utf16}
	 * @returns {integer|boolean} number of bytes written, false on error
	 * @see TEXT_ENCODING
	 */
	function SaveFile(path, contents, format) {
		// path, use "Y:\\Path\\file.txt" or "Y:\\Path\\file.txt:CustomMetaInfo" for ADS
		// contents: any string, e.g. new Date().getTime().toString()
		// format: "base64", "quoted", "auto"=not supplied, "utf-8", "utf-16", "utf-16-le", "utf-16-be"
		// the only ones which worked reliably in my tests are utf-8 & utf-16, since they're the only ones Blob.CopyFrom() supports
		// use only one of encoding.utf8 or encoding.utf16
		//
		// res = SaveFile("Y:\\Path\\file.txt:CustomMetaInfo", encodeURI(new Date().getTime().toString()), encoding.utf16);
		// res = SaveFile("Y:\\Path\\file.txt:CustomMetaInfo", encodeURI("{\"a\": 1}"), encoding.utf8);
		var res = false, decFormat;

		decFormat = format === TEXT_ENCODING.utf16 ? '' : 'utf8';	// unlike ST.Encode()/Decode(), Blob.CopyFrom() uses 'utf8', not 'utf-8'
		format 	  = format === TEXT_ENCODING.utf16 ? 'utf-16' : 'utf-8';

		var fh = DOpus.FSUtil.OpenFile(path, 'wa'); // wa: wa - create a new file, always. If the file already exists it will be overwritten. (This is the default.)
		if(fh.error !== 0) {
			logger.error(path + ', error occurred while opening file: ' + fh.error); return;
		}
		try {
			logger.verbose('String to write to ' + path + ': ' + contents);
			var blob = DOpus.Create.Blob;
			blob.CopyFrom(contents, decFormat);	// seems to use implicitly utf-16, only available optional param is utf8
			res = util.st.Decode(blob, format);
			logger.verbose('blob -- type: ' + typeof blob + ', size: ' + blob.size + "\n" + res);
			res = fh.Write(blob);
			logger.verbose('Written bytes: ' + res);
		} catch(e) { logger.error(path + ', fh.write: ' + e.description); }
		blob.Free();
		fh.Close();
		return res;
	}
	/**
	 * checks if given path is valid
	 * @param {string} path file path
	 * @returns {boolean} true if file exists
	 */
	function IsValidPath(path) {
		return DOpus.FSUtil.Exists(path);
	}
	// /**
	//  * checks if given item has a hash stream
	//  * @param {DOpusItem} oItem DOpus item object
	//  * @returns {boolean} true if file has a hash stream
	//  * @see getHashStreamNameOLD()
	//  */
	// function ADS.hasHashStream(oItem) {
	// 	if (oItem.is_dir || oItem.is_reparse || oItem.is_junction || oItem.is_symlink) return false;
	// 	return IsValidPath(oItem.realpath + ':' + getHashStreamNameOLD());
	// }
	/**
	 * returns the hash stream name
	 * WARNING: if you change this you will lose access to streams and they will become orphans
	 * @param {string} algorithm one of DOpus builtin algorithms: sha1, sha256, sha512, md5, etc.
	 * @returns {string} the ADS stream name to use
	 */
	function getHashStreamNameOLD(algorithm) {
		// TODO - REVIEW - might be converted to a config parameter?
		if (typeof algorithm === 'undefined') algorithm = CURRENT_ALGORITHM;
		return STREAM_PREFIX + algorithm.toUpperCase();
	}
}


/*
	       d8888 8888888b.   .d8888b.             d8888  .d8888b.   .d8888b.  8888888888  .d8888b.   .d8888b.
	      d88888 888  "Y88b d88P  Y88b           d88888 d88P  Y88b d88P  Y88b 888        d88P  Y88b d88P  Y88b
	     d88P888 888    888 Y88b.               d88P888 888    888 888    888 888        Y88b.      Y88b.
	    d88P 888 888    888  "Y888b.           d88P 888 888        888        8888888     "Y888b.    "Y888b.
	   d88P  888 888    888     "Y88b.        d88P  888 888        888        888            "Y88b.     "Y88b.
	  d88P   888 888    888       "888       d88P   888 888    888 888    888 888              "888       "888
	 d8888888888 888  .d88P Y88b  d88P      d8888888888 Y88b  d88P Y88b  d88P 888        Y88b  d88P Y88b  d88P
	d88P     888 8888888P"   "Y8888P"      d88P     888  "Y8888P"   "Y8888P"  8888888888  "Y8888P"   "Y8888P"
*/
{
	function __ADS_ACCESS__(){}
	var ADS = (function(){
		var myName = 'ADS';

		var msn = getHashStreamName();

		function validateStreamNameAndItem(callerName, oItem) {
			var msg;
			if (!msn) {
				msg = sprintf('%s -- Cannot continue without a stream name: %s', callerName, msn);
				logger.error(msg);
				throw new Error(msg);
			}
			if (!doh.isValidDOItem(oItem)) {
				msg = sprintf('%s -- Expected DOpus Item, got type: %s, value: %s', callerName, dumpObject(oItem));
				logger.error(msg);
				throw new Error(msg);
			}
			return ''+oItem.realpath; // realpath returns a DOpus Path object and it does not work well with Map as an object, we need a simple string
		}
		/**
		 * initializes a DOpus Map for DOpus.Vars cache
		 * @returns nothing
		 */
		function initCacheIfNecessary() {
			var fnName = 'ADS.initCacheIfNecessary';
			if (!CACHE_ENABLED) {
				logger.verbose(sprintf('%s -- Cache not enabled: %b', fnName, CACHE_ENABLED));
				return;
			}
			if (util.sv.Exists('cache')) {
				logger.verbose(sprintf('%s -- Cache already initialized - Current count: %d', fnName, util.sv.Get('cache').count));
				return;
			}
			if (!util.sv.Exists('cache') || !util.sv.Get('cache') || typeof util.sv.Get('cache') === 'undefined') {
				onDOpusCmdMHTClearCache();
			}
			logger.force(sprintf('%s -- Cache initialized - Current count: %d', fnName, util.sv.Get('cache').count));
		};
		/**
		 * returns the hash stream name
		 * WARNING: if you change this you will lose access to streams and they will become orphans
		 * @param {string} algorithm one of DOpus builtin algorithms: sha1, sha256, sha512, md5, etc.
		 * @returns {string} the ADS stream name to use
		 */
		function getHashStreamName(algorithm) {
			// TODO - REVIEW - might be converted to a config parameter?
			if (typeof algorithm === 'undefined') algorithm = CURRENT_ALGORITHM;
			return STREAM_PREFIX + algorithm.toUpperCase();
		}
		return {
			name: myName,
			/**
			 * checks if given item has a hash stream
			 * @param {DOpusItem} oItem DOpus item object
			 * @returns {boolean} true if file has a hash stream
			 * @see getHashStreamName()
			 */
			hasHashStream: function(oItem) {
				var fnName = 'ADS.hasHashStream';
				validateStreamNameAndItem(fnName, oItem);
				if (oItem.is_dir || oItem.is_reparse || oItem.is_junction || oItem.is_symlink) return false;
				return IsValidPath(oItem.realpath + ':' + msn);
			},
			/**
			 * returns the stored ADS data as POJO
			 *
			 * uses cache if enabled and possible
			 * @param {item} oItem DOpus item
			 * @returns {POJO|boolean} POJO on success, false on error
			 * @see ReadFile()
			 * @see initCacheIfNecessary()
			 */
			read: function(oItem) {
				var fnName = 'ADS.read';
				validateStreamNameAndItem(fnName, oItem);
				var rp = ''+oItem.realpath; // realpath returns a DOpus Path object and it does not work well with Map as an object, we need a simple string

				initCacheIfNecessary();

				// check if cache is enabled and item is in cache
				var res;

				if (CACHE_ENABLED && util.sv.Get('cache').exists(rp)) {
					logger.verbose(oItem.name + ' found in cache');
					res = util.sv.Get('cache')(rp);
				} else {
					logger.verbose(oItem.name + ' reading from disk');
					res = ReadFile(rp + ':' + msn, TEXT_ENCODING.utf8); // always string or false ion error
					if (res === false) { return res; }
					if (CACHE_ENABLED && typeof res === 'string' && !util.sv.Get('cache').exists(rp)) {
						logger.verbose(oItem.name + ' was missing in cache, adding');
						res = enrichWithCacheFields(res);
						util.sv.Get('cache')(rp) = res;
					}
				}

				// convert to JS object, do not return {} or anything which passes as object but empty string
				return typeof res === 'string' ? JSON.parse(res) : '';
			},
			/**
			 * saves given POJO as ADS data, calls SaveFile()
			 *
			 * populates/updates cache if enabled
			 * @param {item} oItem DOpus Item
			 * @param {POJO} oJSObject any POJO
			 * @returns {integer|boolean} number of bytes written, false on error
			 * @see SaveFile()
			 * @see initCacheIfNecessary()
			 */
			save: function(oItem, oJSObject) {
				var fnName = 'ADS.save';
				validateStreamNameAndItem(fnName, oItem);
				var rp = ''+oItem.realpath; // realpath returns a DOpus Path object, even if its 'default' is map(oItem.realpath) does not work well as key, we need a simple string

				initCacheIfNecessary();

				var orig_modify = DateToDOpusFormat(oItem.modify);

				util.cmd.ClearFiles();
				util.cmd.AddFile(oItem);
				var res = SaveFile(rp + ':' + msn, JSON.stringify(oJSObject), TEXT_ENCODING.utf8);
				logger.info(sprintf('%s -- Saving %s to %s', fnName, JSON.stringify(oJSObject), rp+':'+msn));

				logger.verbose(rp + ', resetting timestamp to: ' + orig_modify);
				util.cmd.RunCommand('SetAttr META "lastmodifieddate:' + orig_modify + '"');

				// check if cache is enabled, add/update unconditionally
				if (CACHE_ENABLED) {
					util.sv.Get('cache')(rp) = enrichWithCacheFields(oJSObject);
					logger.verbose('SaveADS - Cache count: ' + util.sv.Get('cache').count);
				}
				return res;
			},
			/**
			 * deletes ADS data, directly deletes "file:stream"
			 *
			 * removes item from cache if enabled
			 * @param {item} oItem DOpus Item
			 * @returns nothing
			 * @see initCacheIfNecessary()
			 */
			remove: function(oItem) {
				var fnName = 'ADS.delete';
				validateStreamNameAndItem(fnName, oItem);
				var rp = ''+oItem.realpath; // realpath returns a DOpus Path object, even if its 'default' is map(oItem.realpath) does not work well as key, we need a simple string

				initCacheIfNecessary();

				var file_stream = oItem.realpath + ':' + msn;
				var orig_modify = DateToDOpusFormat(oItem.modify);

				util.cmd.ClearFiles();
				util.cmd.AddFile(oItem);
				util.cmd.RunCommand('Delete /quiet /norecycle "' + file_stream + '"');
				logger.verbose(oItem.realpath + ', resetting timestamp to: ' + orig_modify);
				util.cmd.RunCommand('SetAttr META "lastmodifieddate:' + orig_modify + '"');
				if (CACHE_ENABLED) {
					util.sv.Get('cache').erase(rp);
				}
			}
		}
	}());


	/**
	 * adds cache-only fields which are not and will not be stored in streams
	 *
	 * @param {POJO} oPOJO object to enrich with cache-only fields
	 * @returns {POJO} enriched POJO with the fields added_to_cacheXXX
	 */
	function enrichWithCacheFields(oPOJO) {
		// add cache only parameters for tooltips, etc.
		var res = oPOJO;
		if (typeof oPOJO === 'string') {
			res = JSON.parse(res);
		}
		res.added_to_cache          = new Date().getTime();
		res.added_to_cache_friendly = res.added_to_cache.formatAsDateTimeCompact();
		return JSON.stringify(res);
	}
	function removeCacheFields(oPOJO) {
		delete oPOJO.added_to_cache;
		delete oPOJO.added_to_cache_friendly;
	}
	function packageAsPOJO(oItem, hash) {
		// var fnName = 'packageAsPOJO';
		// var msn = ADS.getHashStreamName();
		// if (!msn) { logger.error('ReadADS -- Cannot continue without a stream name: ' + msn); return false; }
		if (!doh.isValidDOItem(oItem)) { logger.error('packageAsPOJO -- Expected DOpus Item, got: ' + oItem + ', type: ' + typeof oItem); return false; }
		return {
			last_modify         : new Date(oItem.modify).getTime(),
			last_modify_friendly: new Date(oItem.modify).getTime().formatAsDateTimeCompact(),
			last_size           : parseInt(oItem.size),
			algorithm           : CURRENT_ALGORITHM,
			hash                : hash
		};
	}
}


/*
	888    888        d8888  .d8888b.  888    888 8888888888 8888888b.   .d8888b.
	888    888       d88888 d88P  Y88b 888    888 888        888   Y88b d88P  Y88b
	888    888      d88P888 Y88b.      888    888 888        888    888 Y88b.
	8888888888     d88P 888  "Y888b.   8888888888 8888888    888   d88P  "Y888b.
	888    888    d88P  888     "Y88b. 888    888 888        8888888P"      "Y88b.
	888    888   d88P   888       "888 888    888 888        888 T88b         "888
	888    888  d8888888888 Y88b  d88P 888    888 888        888  T88b  Y88b  d88P
	888    888 d88P     888  "Y8888P"  888    888 8888888888 888   T88b  "Y8888P"
*/
{
	/**
	 * hash algorithm proxy
	 * to redirect the request to DOpus or external program
	 * @param {item} oItem DOpus Item
	 * @param {string} algo Hashing algorithm to use
	 * @returns {Result} result object
	 * @see CURRENT_ALGORITHM
	 */
	function calculateHashProxy(oItem, algo) {
		algo = algo || CURRENT_ALGORITHM;
		switch(algo.toUpperCase()) {
			case 'SHA1':
			case 'MD5':
			case 'CRC32':
			case 'CRC32_PHP':
			case 'CRC32_PHP_REV':
				return calculateFileHashWithDOpus(oItem, algo);
			case 'SHA256':
			case 'SHA512':
				abortWithFatalError('Current DOpus version as of 20210120 has a bug with files >512 MB when using SHA256 or SHA512. See: https://resource.dopus.com/t/column-sha-256-and-sha-512/33525/6');
			default:
				abortWithFatalError('Given algorithm is not (yet) implemented, but you can easily use an external app if you want.');
		}
	}
	/**
	 * internal method to calculate hash with given algorithm
	 * @param {item} oItem DOpus Item
	 * @param {string} algo Hashing algorithm to use
	 * @see CURRENT_ALGORITHM
	 */
	/**
	 * @param {object} oItem DOpus Item
	 * @param {string} algo algorithm to use
	 * @returns {Result} result object
	 */
	function calculateFileHashWithDOpus(oItem, algo) {
		var fnName = 'calculateFileHashWithDOpus'
		if (!doh.isValidDOItem(oItem)) return logger.error(sprintf('%s -- No file name received: ', fnName, oItem));

		var outObj = new Result();
		logger.verbose(sprintf('\t\t%s -- Calculating %s hash, started @%s, file: %s', fnName, algo, getTS(), oItem));

		try {
			outObj = new Result(DOpus.FSUtil().Hash(oItem, algo), false, false);
			// outObj['result'] = DOpus.FSUtil().Hash(oItem, algo);
			logger.info(sprintf('\t\t%s -- Calculating %s hash, finished @%s, file: %s, result: %s', fnName, algo, getTS(), oItem, outObj['result']));
		} catch (e) {
			outObj = new Result(false, e.toString(), false);
			// outObj['error'] = e;
			logger.force(sprintf('\t\t%s -- Error: %s, File: %s', fnName, e.toString(), oItem));
		}
		return outObj;
	}
}

/*
	8888888888 8888888 888    88888888888 8888888888 8888888b.   .d8888b.
	888          888   888        888     888        888   Y88b d88P  Y88b
	888          888   888        888     888        888    888 Y88b.
	8888888      888   888        888     8888888    888   d88P  "Y888b.
	888          888   888        888     888        8888888P"      "Y88b.
	888          888   888        888     888        888 T88b         "888
	888          888   888        888     888        888  T88b  Y88b  d88P
	888        8888888 88888888   888     8888888888 888   T88b  "Y8888P"
*/
{
	function __FILTERS__(){}
	// valid filters for workers
	var filters = (function(){
		var myName = 'filters';
		var PUBLIC = {
			fnFilterAcceptAnyFile: function(oItem) {
				return true;
			},
			fnFilterRejectAnyFile: function(oItem) {
				return false;
			},
			fnFilterAcceptDirtyOnly: function(oItem, oADSData) {
				var res = false;
				if (typeof oADSData === 'undefined') {
					if(!ADS.hasHashStream(oItem)) {
						return res;
					}
					oADSData = ADS.read(oItem);
					if (!oADSData.hasOwnProperty('last_modify') || !oADSData.hasOwnProperty('last_size')) {
						return res;
					}
				}
				var differentModifDate = new Date(oItem.modify).valueOf() !== oADSData.last_modify,
					differentSize      = parseInt(oItem.size)             !== oADSData.last_size;
				res = differentModifDate || differentSize;
				return res;
			},
			fnFilterAcceptWithValidHashesOnly: function(oItem, oADSData) {
				return PUBLIC.fnFilterAcceptWithHashes(oItem, oADSData) && !(PUBLIC.fnFilterAcceptDirtyOnly(oItem, oADSData)); // note how we must reverse the value
			},
			fnFilterAcceptWithHashes: function(oItem) {
				return ADS.hasHashStream(oItem);
			},
			fnFilterRejectWithHashes: function(oItem) {
				return !(PUBLIC.fnFilterAcceptWithHashes(oItem)); // note how we must reverse the value
			},
			fnFilterAcceptMissingOrDirty: function(oItem) {
				// put missing first, because it will be often faster to check if a stream exists than opening and parsing it
				return PUBLIC.fnFilterRejectWithHashes(oItem) || PUBLIC.fnFilterAcceptDirtyOnly(oItem);
			}
		};
		return {
			name: myName,
			PUBLIC: PUBLIC,
			// another ugly solution
			getName: function(fnFunction) {
				var fnName = 'filters.getName';
				for (var fn in this.PUBLIC) {
					if (!this.PUBLIC.hasOwnProperty(fn)) continue;
					if (fnFunction == this.PUBLIC[fn]) return fn;
				}
				abortWithFatalError(sprintf('%s -- Unrecognized filter:\n%s', fnName, dumpObject(fnFunction)));
			}
		}
	}());
}


/*
	       d8888  .d8888b. 88888888888 8888888  .d88888b.  888b    888  .d8888b.
	      d88888 d88P  Y88b    888       888   d88P" "Y88b 8888b   888 d88P  Y88b
	     d88P888 888    888    888       888   888     888 88888b  888 Y88b.
	    d88P 888 888           888       888   888     888 888Y88b 888  "Y888b.
	   d88P  888 888           888       888   888     888 888 Y88b888     "Y88b.
	  d88P   888 888    888    888       888   888     888 888  Y88888       "888
	 d8888888888 Y88b  d88P    888       888   Y88b. .d88P 888   Y8888 Y88b  d88P
	d88P     888  "Y8888P"     888     8888888  "Y88888P"  888    Y888  "Y8888P"
*/
{
	function __ACTIONS__(){}
	// valid actions for workers
	var actions = (function(){
		var myName = 'actions';
		// function wrapResultAndError(result, error) {
		// 	return { result: result, error: error };
		// }
		var PUBLIC = {
			fnActionNull: function() {
				// nothing
			},
			fnActionCalculateOnly: function(oItem) {
				var fnName = 'actions.fnActionCalculateOnly';
				logger.verbose(sprintf('%s -- I got called with: %s', fnName, dumpObject(oItem)));
				return calculateHashProxy(oItem);
			},
			fnActionCalculateAndCompareToADS: function(oItem) {
				var fnName = 'actions.fnActionCalculateAndCompareToADS';
				logger.verbose(sprintf('%s -- I got called with: %s', fnName, dumpObject(oItem)));

				var oldData = ADS.read(oItem);
				var newHashResult = calculateHashProxy(oItem);
				logger.verbose(sprintf('%s -- old: %s, new: %s', fnName, oldData.hash, newHashResult.result));

				if (newHashResult.isOK() && newHashResult.ok === oldData.hash) {
					return new Result('Stored hash is valid', false, false);
				} else {
					return new Result(false, 'Hashes differ! Stored: ' + oldData.hash + ', New: ' + newHashResult.ok);
				}
			},
			fnActionCalculateAndSaveToADS: function(oItem) {
				var fnName = 'actions.fnActionCalculateAndSaveToADS';
				logger.verbose(sprintf('%s -- I got called with: %s', fnName, dumpObject(oItem)));
				var newHashResult = calculateHashProxy(oItem);

				if (newHashResult.isOK()) {
					ADS.save(oItem, packageAsPOJO(oItem, newHashResult.ok));
				}
				return newHashResult;
			},
			fnActionDeleteADS: function(oItem) {
				var fnName = 'actions.fnActionDeleteADS';
				logger.verbose(sprintf('%s -- I got called with: %s', fnName, dumpObject(oItem)));
				ADS.remove(oItem);
				return new HashResult(true);
			}
		};
		return {
			name: myName,
			PUBLIC: PUBLIC,
			validate: function(name) {
				var fnName = 'actions.validate';
				if (!PUBLIC.hasOwnProperty(name)) {
					// abortWithFatalError(sprintf('%s -- No or invalid action -- type: %s - %s', fnName, typeof name, name));
					abortWithFatalError(sprintf('%s -- Unrecognized action:\n%s', fnName, dumpObject(fnFunction)));
				}
			},
			// another ugly solution
			getName: function(fnFunction) {
				var fnName = 'actions.getName';
				for (var fn in this.PUBLIC) {
					if (!this.PUBLIC.hasOwnProperty(fn)) continue;
					if (fnFunction == this.PUBLIC[fn]) return fn;
				}
				abortWithFatalError(sprintf('%s -- Unrecognized action:\n%s', fnName, dumpObject(fnFunction)));
			},
			getFunc: function(name) {
				this.validate(name);
				return PUBLIC[name];
			}
		}
	}());
}


/*
	 .d8888b. 88888888888  .d88888b.  8888888b.  888       888        d8888 88888888888  .d8888b.  888    888
	d88P  Y88b    888     d88P" "Y88b 888   Y88b 888   o   888       d88888     888     d88P  Y88b 888    888
	Y88b.         888     888     888 888    888 888  d8b  888      d88P888     888     888    888 888    888
	 "Y888b.      888     888     888 888   d88P 888 d888b 888     d88P 888     888     888        8888888888
	    "Y88b.    888     888     888 8888888P"  888d88888b888    d88P  888     888     888        888    888
	      "888    888     888     888 888        88888P Y88888   d88P   888     888     888    888 888    888
	Y88b  d88P    888     Y88b. .d88P 888        8888P   Y8888  d8888888888     888     Y88b  d88P 888    888
	 "Y8888P"     888      "Y88888P"  888        888P     Y888 d88P     888     888      "Y8888P"  888    888
*/
{
	function __STOPWATCH__(){}
	var stopwatch = (function(){
		var myName = 'stopwatch';
		var _running = {};
		function ensureExists(name, action) {
			var fnName = 'ensureExists';
			if(!_running.hasOwnProperty(name)) {
				abortWithFatalError(sprintf('%s -- Given stopwatch name %s is invalid for action %s', fnName, name, action));
			}
		}
		function ensureNotExists(name, action) {
			var fnName = 'ensureNotExists';
			if(_running.hasOwnProperty(name)) {
				abortWithFatalError(sprintf('%s -- Given stopwatch name %s is invalid for action %s', fnName, name, action));
			}
		}
		return {
			name: myName,
			/**
			 * starts a stopwatch
			 * @param {string} id any unique name
			 * @returns {number} current timestamp in millisecs
			 */
			start: function(id) {
				ensureNotExists(id, 'start');
				_now = getTS();
				_running[id] = { startTS: _now, finishTS: 0 }
				return _now;
			},
			/**
			 * resets the stopwatch
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			reset: function(id) {
				ensureExists(id, 'reset');
				var _now = getTS();
				var _elapsed = _now - _running[id]['startTS'];
				_running[id]['startTS'] = _now;
				return _elapsed;
			},
			/**
			 * returns elapsed time
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			getElapsed: function(id) {
				ensureExists(id, 'getElapsed');
				var _elapsed =  getTS() - _running[id]['startTS'];
				return _elapsed;
			},
			/**
			 * stops the stopwatch and returns elapsed time
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			stop: function(id) {
				ensureExists(id, 'stop');
				var _elapsed = getTS() - _running[id]['startTS']
				delete _running[id];
				return _elapsed;
			},
			/**
			 * starts a stopwatch and returns a formatted string
			 * @param {string} id any unique name
			 * @param {string} prefix string prefix in output
			 * @param {string} suffix string suffix in output
			 * @returns {number} current time in millisecs
			 * @see this.start
			 */
			startAndPrint: function(id, prefix, suffix) {
				this.start(id);
				return sprintf('%s -- %s Started @%d %s', id, (prefix ? prefix + ' -' : ''), _running[id]['startTS'], (suffix ? '- ' + suffix : ''));
			},
			/**
			 * resets the stopwatch and returns a formatted string
			 * @param {string} id any unique name
			 * @param {string} prefix string prefix in output
			 * @param {string} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see this.reset
			 */
			resetAndPrint: function(id, prefix, suffix) {
				var _elapsed = this.reset(id);
				return sprintf('%s -- %s Reset @%d, Elapsed so far: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), _running[id]['startTS'], _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
			},
			/**
			 * returns elapsed time as a formatted string
			 * @param {string} id any unique name
			 * @param {string} prefix string prefix in output
			 * @param {string} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see this.getElapsed
			 */
			getElapsedAndPrint: function(id, prefix, suffix) {
				var _elapsed =  this.getElapsed(id);
				return sprintf('%s -- %s Elapsed so far: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
			},
			/**
			 * stops a stopwatch and returns elapsed time as a formatted string
			 * @param {string} id any unique name
			 * @param {string} prefix string prefix in output
			 * @param {string} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see this.stop
			 */
			stopAndPrint: function(id, prefix, suffix) {
				var _elapsed = this.stop(id);
				return sprintf('%s -- %s Finished @%d, Duration: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), getTS(), _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
			}
		}
	}());
}


/*
	8888888b.  8888888b.   .d88888b.   .d8888b.  8888888b.  8888888888  .d8888b.   .d8888b.      888888b.          d8888 8888888b.
	888   Y88b 888   Y88b d88P" "Y88b d88P  Y88b 888   Y88b 888        d88P  Y88b d88P  Y88b     888  "88b        d88888 888   Y88b
	888    888 888    888 888     888 888    888 888    888 888        Y88b.      Y88b.          888  .88P       d88P888 888    888
	888   d88P 888   d88P 888     888 888        888   d88P 8888888     "Y888b.    "Y888b.       8888888K.      d88P 888 888   d88P
	8888888P"  8888888P"  888     888 888  88888 8888888P"  888            "Y88b.     "Y88b.     888  "Y88b    d88P  888 8888888P"
	888        888 T88b   888     888 888    888 888 T88b   888              "888       "888     888    888   d88P   888 888 T88b
	888        888  T88b  Y88b. .d88P Y88b  d88P 888  T88b  888        Y88b  d88P Y88b  d88P     888   d88P  d8888888888 888  T88b
	888        888   T88b  "Y88888P"   "Y8888P88 888   T88b 8888888888  "Y8888P"   "Y8888P"      8888888P"  d88P     888 888   T88b
*/
{
	function __PROGRESS_BAR__(){}
	// TODO - convert these methods to its own object
	function initializeProgressBar(cmdData) {
		// INITIALIZE PROGRESS BAR
		if (!USE_PROGRESS_BAR) return;

		var progbar = cmdData.func.command.progress;
		progbar.pause = true;
		progbar.abort = true;
		// progbar.full  = true;
		progbar.bytes = true;
		progbar.Init(cmdData.func.sourcetab, ''); // window title
		progbar.SetStatus('Running workers');           // header
		progbar.AddFiles(1, 100);                       // Leo's sample: add '1' fictitious file which acts as 0-100% progress
		progbar.Show();
		progbar.SetFileSize(100);                       // set fictitious file's size
		// careful with the 'size' here
		// using progbar.AddFiles(1, selected_bytes_cnt) will not work, anything beyond 2^31 (2 GB) causes a JS error
		// progbar.AddFiles(1, 2147483648);                          // doesn't work, error "Variable uses an Automation type not supported in JScript (0x800a01ca)"
		// progbar.AddFiles(1, 2147483647);                          // works
		// and obviously this won't work either
		// progbar.AddFiles(selected_items_cnt, selected_bytes_cnt); // doesn't work
		return progbar;
	}
	// TODO - review parameters list
	function updateProgressBar(progbar, tsStart, filename, finished_bytes_so_far, selected_bytes_cnt, formattedMax, unitMax) {
		var userAborted = false;

		// UPDATE THE PROGRESS BAR
		if (!USE_PROGRESS_BAR) return userAborted;

		switch (progbar.GetAbortState()) {
			case 'a':
				userAborted = true;
				break;
			case 'p':
				while (progbar.GetAbortState() !== '') {
					setPauseStatus(true);
					if (sleepdur) DOpus.Delay(sleepdur);
					if (progbar.GetAbortState() === 'a') {
						userAborted = true;
						break;
					}
				}
				setPauseStatus(false);
				break;
		}
		// return userAborted;
		// logger.force(sprintf('%s -- totalbytes: %d, selected_bytes_cnt: %d', fnName, totalbytes, selected_bytes_cnt));
		var elapsed          = (getTS() - tsStart)/1000;
		var percentage       = Math.floor(100 * finished_bytes_so_far / selected_bytes_cnt);
		var formattedCurrent = finished_bytes_so_far.formatAsSize(unitMax);

		if (getTS() % 10 === 0) {
			// refresh these slower
			var bytesPerSec      = Math.round( finished_bytes_so_far / elapsed||1 );
			var timeRemaining    = elapsed < 3 ? '....' : Math.round( elapsed * ( (selected_bytes_cnt/finished_bytes_so_far) - 1) ) + 's';
			progbar.SetStatus(sprintf('Time Remaining (rough): %4s, Average Speed: %7s/s', timeRemaining, bytesPerSec.formatAsSize()));
		}
		progbar.SetName(filename);
		progbar.SetType('file');
		progbar.SetBytesProgress(percentage);
		progbar.SetTitle(sprintf('%2d% - %s/%s', percentage, formattedCurrent, formattedMax));
		return userAborted;
	}
	function finalizeProgressBar(progbar) {
		if (!USE_PROGRESS_BAR) return;
	logger.force(sprintf('%s -- here'));

		// progbar.SetBytesProgress(100);
		progbar.FinishFile();
		// DOpus.Delay(10);
		// progbar.SkipFile();
		// DOpus.Delay(10);
		progbar.Hide();
	}
	function setPauseStatus(status) {
		// true: paused, false: unpaused/unknown
		util.sv.Set('paused') = !!status;
	}
	function getPauseStatus() {
		return util.sv.Exists('paused') ? util.sv.Get('paused') : false;
	}
	function setAbortStatus(status) {
		util.sv.Set('aborted') = !!status;
	}
	function getAbortStatus() {
		return util.sv.Exists('aborted') ? util.sv.Get('aborted') : false;
	}
}


/*
	8888888888 8888888888 8888888888 8888888b.  888888b.          d8888  .d8888b.  888    d8P
	888        888        888        888  "Y88b 888  "88b        d88888 d88P  Y88b 888   d8P
	888        888        888        888    888 888  .88P       d88P888 888    888 888  d8P
	8888888    8888888    8888888    888    888 8888888K.      d88P 888 888        888d88K
	888        888        888        888    888 888  "Y88b    d88P  888 888        8888888b
	888        888        888        888    888 888    888   d88P   888 888    888 888  Y88b
	888        888        888        888  .d88P 888   d88P  d8888888888 Y88b  d88P 888   Y88b
	888        8888888888 8888888888 8888888P"  8888888P"  d88P     888  "Y8888P"  888    Y88b
*/
{
	function __FEEDBACK__(){}
	function showMessageDialog(dialog, msg, title, buttons) {
		var dlgConfirm      = dialog || DOpus.Dlg();
		dlgConfirm.message  = msg;
		dlgConfirm.title    = Global.SCRIPT_NAME + '-' + (title || '');
		dlgConfirm.buttons  = buttons || 'OK';
		var ret = dlgConfirm.show;
		return ret;
	}
	function abortWithFatalError(msg) {
		var err = sprintf('Fatal error occurred:\n\n%s', msg);
		logger.force('');
		logger.force('');
		logger.force('');
		logger.force('');
		logger.force(err);
		showMessageDialog(null, err);
		throw new Error(err);
	}
	var busyIndicator = (function(){
		var myName = 'busyIndicator';
		var _busyind = false;
		return {
			name: myName,
			start: function(sourceTab, message) {
				if (_busyind) this.stop();
				_busyind = DOpus.Create.BusyIndicator();
				_busyind.Init(sourceTab);
				_busyind.Update(message);
				_busyind.Show();
			},
			stop: function() {
				if (!_busyind) return;
				_busyind.Destroy();
				_busyind = false;
			}
		}
	}());
}


/*
	888     888 88888888888 8888888 888
	888     888     888       888   888
	888     888     888       888   888
	888     888     888       888   888
	888     888     888       888   888
	888     888     888       888   888
	Y88b. .d88P     888       888   888
	 "Y88888P"      888     8888888 88888888
*/
{
	function __UTIL__(){}
	function getTS() {
		return new Date().getTime();
	}
	function getNewThreadID() {
		return 't_' + getTS() + '_' + Math.floor(100 + Math.random() * 899);
	}
	function getResVar(tid) {
		return 'v_' + tid;
	}
	// internal method
	// from https://attacomsian.com/blog/javascript-check-variable-is-object
	function isObject(obj) {
		return Object.prototype.toString.call(obj) === '[object Object]';
	};
	Object.prototype.keys = function() {
		// WARNING: be careful using this!
		// for (var k in myObject) for ANY object will include this function by default
		// if this function needs to be skipped, use if (!myObject.hasOwnProperty(k)) continue;
		var out = [];
		for (var k in this) {
			if (this.hasOwnProperty(k)) out.push(k);
		}
		return out;
	};
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, ''); // not even trim() JScript??
	}
}


/*
	 .d88888b.  888888b. 888888 8888888888  .d8888b. 88888888888  .d8888b.
	d88P" "Y88b 888  "88b  "88b 888        d88P  Y88b    888     d88P  Y88b
	888     888 888  .88P   888 888        888    888    888     Y88b.
	888     888 8888888K.   888 8888888    888           888      "Y888b.
	888     888 888  "Y88b  888 888        888           888         "Y88b.
	888     888 888    888  888 888        888    888    888           "888
	Y88b. .d88P 888   d88P  88P 888        Y88b  d88P    888     Y88b  d88P
	 "Y88888P"  8888888P"   888 8888888888  "Y8888P"     888      "Y8888P"
	                      .d88P
	                    .d88P"
	                   888P"
*/

{

	/**
	 * Generic Result object
	 * @param {any} oOKValue value on success
	 * @param {any} oErrValue value on error
	 */
	function Result(oOKValue, oErrValue, oSkipValue) {
		this.ok        = oOKValue;
		this.err       = oErrValue;
		this.skip      = oSkipValue;
		this.isOK      = function() { return this.ok && !this.err && !this.skipped }
		this.isErr     = function() { return this.err ? true : false }
		this.isSkipped = function() { return this.skipped ? true : false }
		this.toString  = function() { return JSON.stringify(this, null, 4) }
	}

	/**
	 * ADS-Cached Item
	 * @param {object} oItem DOpus Item object
	 * @param {string} hash hash checksum
	 * @param {string} algorithm algorithm used
	 */
	function CachedItem(oItem, hash, algorithm) {
		if (!doh.isValidDOItem(oItem)) {
		// if (typeof oItem !== 'object' || !oItem.modify || !oItem.size) {
			throw new Error('Expected DOpus item object');
		}
		this.last_modify          = new Date(oItem.modify).getTime();
		this.last_modify_friendly = new Date(oItem.modify).getTime().formatAsDateTimeCompact();
		this.last_size            = parseInt(oItem.size);
		this.hash                 = hash;
		this.algorithm            = algorithm||CURRENT_ALGORITHM;
		this.enrichWithCacheFields = function() {
			// add cache only parameters for tooltips, etc.
			this.added_to_cache          = new Date().getTime();
			this.added_to_cache_friendly = this.added_to_cache.formatAsDateTimeCompact();
			return JSON.stringify(this);
		}
		this.removeCacheFields = function() {
			delete this.added_to_cache;
			delete this.added_to_cache_friendly;
		}
	}
	// these do not work
	// CachedItem.prototype = Object.Create(BaseItem.prototype);
	// CachedItem.prototype = new BaseItem();
	// CachedItem.prototype.constructor = CachedItem;

	/**
	 * Hashed Item
	 * @param {object} oItem DOpus Item
	 * @param {boolean} skipped true if item was skipped by filters
	 * @param {any} error any error message string or object
	 */
	function HashedItem(oItem, relpath, skipped, error, hash, algorithm) {
		if (!doh.isValidDOItem(oItem)) {
		// if (typeof oItem !== 'object' || !oItem.modify || !oItem.size) {
			throw new Error('Expected DOpus item object');
		}
		this.fullpath  = ''+oItem.realpath || '';
		this.size      = parseInt(oItem.size) || 0;
		this.mod_ts    = new Date(oItem.modify).getTime() || 0;
		this.mod_date  = this.mod_ts.formatAsDateTimeCompact();
		this.relpath   = ''+relpath || '';
		this.name      = ''+oItem.name;
		this.skipped   = skipped || false;
		this.error     = error;
		this.hash      = hash || '';
		this.algorithm = algorithm || '';
		function getRelativeToPath(currentPath) {
			var that = this;
			if (currentPath) {
				that.relpath = that.relpath.replace(currentPath, '') || that.relpath;
			}
			return that;
		}
	}

	/**
	 * General Purpose Hashed Items Collection
	 */
	function HashedItemsCollection() {
		this._myItems     = {};
		this.dateEarliest = 253402214400000; // 9999-12-31
		this.dateLatest   = 0;
		this.fileEarliest = '';
		this.fileLatest   = '';
		/**
		 * do not call directly!
		 * @param {function} fnFilter filter
		 */
		this._filterBy = function(fnFilter) {
			var out = {};
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				if (fnFilter(this._myItems[fp])) out[fp] = this._myItems[fp];
			}
			return out;
		}
		/**
		 * @param {HashedItem} oHashedItem
		 * @see HashedItem
		 */
		this.addItem = function(oHashedItem) {
			if (!(oHashedItem instanceof HashedItem)) {
				throw new Error('Expected HashedItem object, got:\n' + dumpObject(oHashedItem));
			}
			this._myItems[oHashedItem.path] = oHashedItem;
			if (this.dateEarliest > oHashedItem.date) {
				this.fileEarliest = oHashedItem.path;
				this.dateEarliest = oHashedItem.date;
			}
			if (this.dateLatest < oHashedItem.date) {
				this.fileLatest = oHashedItem.path;
				this.dateLatest = oHashedItem.date;
			}
		}
		/**
		 * @param {string} path full path
		 * @returns {HashedItem}
		 */
		this.getItemByPath = function(path) {
			if (typeof path !== 'string') {
				throw new Error('Expected path string, got type: ' + typeof path + ', value:  ' + path);
			}
			return this._myItems[path];
		}
		/**
		 * @param {object} oDOpusItem DOpus item
		 * @returns {HashedItem}
		 */
		this.getItemByDOpusItem = function(oDOpusItem) {
			if (!doh.isValidDOItem(oDOpusItem)) {
				throw new Error('Expected DOpus Item, got type: ' + typeof oDOpusItem + ', value:  ' + oDOpusItem);
			}
			return this._myItems[''+oDOpusItem.realpath];
		}
		this.getSuccessItems = function() { return this._filterBy(function(o){ return o.error === undefined && o.skipped === false }) }
		this.getErrorItems   = function() { return this._filterBy(function(o){ return o.error !== undefined }) }
		this.getSkippedItems = function() { return this._filterBy(function(o){ return o.skipped === true }) }
		this.getEarliestFile = function() { return this.fileEarliest }
		this.getLatestFile   = function() { return this.fileLatest }
		this.getEarliestDate = function() { return this.dateEarliest }
		this.getLatestDate   = function() { return this.dateLatest }
	}
	/**
	 * General Purpose Conversion & Filtering Results
	 * @param {HashedItemsCollection} oHashedItemsColl
	 * @param {string} rootPath root path
	 * @param {string} algorithm hashing algorithm
	 * @param {integer} validCount
	 * @param {integer} invalidCount
	 */
	function ConversionResults(oHashedItemsColl, rootPath, algorithm) {
		if(!(oHashedItemsColl instanceof HashedItemsCollection)) {
			// throw new Error('Expected HashedItemsCollection, got type: ' + typeof oHashedItemsColl + ', value: ' + oHashedItemsColl);
			throw new Error('Expected HashedItemsCollection object, got:\n' + dumpObject(oHashedItemsColl));
		}
		// if(typeof oHashedItemsColl !== 'object' || oHashedItemsColl.prototype !== HashedItemsCollection.prototype) {
		// 	throw new Error('Expected HashedItemsCollection, got type: ' + typeof oHashedItemsColl + ', value: ' + oHashedItemsColl);
		// }
		this.items        = oHashedItemsColl;
		this.rootPath     = rootPath || '';
		this.algorithm    = algorithm || '';

		this.items.prototype = HashedItemsCollection.prototype;

		this.ts           = getTS();
		this.getPOJO = function() {
			var oSuccess = this.items.getSuccessItems(),
				oSkipped = this.items.getSkippedItems(),
				oError   = this.items.getErrorItems();
			var outPOJO  = {
					RootPath                       : this.rootPath,
					Algorithm                      : this.algorithm,
					ValidCount                     : this.items.getSuccessItems().keys().length,
					InvalidCount                   : this.items.getErrorItems().keys().length,
					Generated_By                   : sprintf('%s v%s -- %s', Global.SCRIPT_NAME, Global.SCRIPT_VERSION, Global.SCRIPT_URL),
					Snapshot_DateTime_Compact      : this.ts.formatAsDateTimeCompact(),
					Snapshot_DateTime_Timestamp    : this.ts,
					Snapshot_DateTime_DOpus        : this.ts.formatAsDateDOpus(),
					Snapshot_DateTime_ISO          : this.ts.formatAsDateISO(),
					Snapshot_DateTime_String       : new Date(this.ts).toString(),
					Snapshot_DateTime_UTC          : new Date(this.ts).toUTCString(),
					Snapshot_DateTime_Locale       : new Date(this.ts).toLocaleString(),
					Earliest_File_Name             : this.items.getEarliestFile(),
					Earliest_File_DateTime_TS      : this.items.getEarliestDate(),
					Earliest_File_DateTime_Compact : this.items.getEarliestDate().formatAsDateTimeCompact(),
					Latest_File_Name               : this.items.getLatestFile(),
					Latest_File_DateTime_TS        : this.items.getLatestDate(),
					Latest_File_DateTime_Compact   : this.items.getLatestDate().formatAsDateTimeCompact(),
					items                          : oSuccess
				}
			if (oSkipped) outPOJO.skipped = oSkipped;
			if (oError)   outPOJO.error   = oError;
			return outPOJO;
		}
	}
}

/*
	888     888  .d8888b.  888    Y88b   d88P     888888b.  8888888 88888888888  .d8888b.
	888     888 d88P  Y88b 888     Y88b d88P      888  "88b   888       888     d88P  Y88b
	888     888 888    888 888      Y88o88P       888  .88P   888       888     Y88b.
	888     888 888        888       Y888P        8888888K.   888       888      "Y888b.
	888     888 888  88888 888        888         888  "Y88b  888       888         "Y88b.
	888     888 888    888 888        888         888    888  888       888           "888
	Y88b. .d88P Y88b  d88P 888        888         888   d88P  888       888     Y88b  d88P
	 "Y88888P"   "Y8888P88 88888888   888         8888888P" 8888888     888      "Y8888P"
*/
{
	// a couple of methods for scriptCmdData
	// doh: DOpus Helper
	var doh = (function(){
		var myName = 'doh';
		function _validate(cmdData) {
			if (!cmdData.func || !cmdData.func.sourcetab) {
				throw new Error('this object type is not supported');
			}
			return true;
		}
		return {
			name: myName,
			/**
			 * DOpus.FSUtil.GetItem wrapper
			 * @param {string} sPath file full path
			 * @returns {object} DOpus Item
			 */
			getItem: function(path) {
				if (typeof path !== 'string') {
					throw new Error('Expected path string, got type: ' + typeof path + ', value:  ' + path);
				}
				var _tmp = DOpus.FSUtil.GetItem(path);
				return this.isValidDOItem(_tmp) ? _tmp : false;
			},
			/**
			 * @param {object} oItem DOpus Item
			 * @returns {boolean} true if DOpus item
			 */
			isValidDOItem: function(oItem) {
				return (typeof oItem === 'object' && oItem.realpath && oItem.modify && oItem.size);
			},
			/**
			 * @param {object} oCmdData DOpus command data
			 * @returns {boolean} true if DOpus command data
			 */
			isValidCommandData: function(oCmdData) {
				return (typeof oCmdData === 'object' && oCmdData.func && oCmdData.func.Dlg);
			},
			/**
			 * @param {object} oColData DOpus column data
			 * @returns {boolean} true if DOpus column data
			 */
			isValidColumnData: function(oColData) {
				return (typeof oColData === 'object' && typeof oColData.value !== 'undefined' && typeof oColData.group !== 'undefined');
			},
			/**
			 * @param {object} oMap DOpus Map
			 * @returns {boolean} true if DOpus Map
			 */
			isValidDOpusMap: function(oMap) {
				return (typeof oMap === 'object' && typeof oMap.capacity === 'undefined' && typeof oMap.count !== 'undefined' && typeof oMap.length !== 'undefined' && oMap.count === oMap.length);
			},
			/**
			 * @param {object} oVector DOpus Vector
			 * @returns {boolean} true if DOpus Vector
			 */
			isValidDOpusVector: function(oVector) {
				return (typeof oVector === 'object' && typeof oVector.capacity !== 'undefined' && typeof oVector.count !== 'undefined' && typeof oVector.length !== 'undefined' && oVector.count === oVector.length);
			},
			// current tab's path
			getCurrentPath: function(cmdData) {
				// auto convert to string, and make sure it has a trailing slash
				return _validate(cmdData) && (''+cmdData.func.sourcetab.path+'\\').replace(/\\\\/g, '\\');
			},

			// if the current lister tab is 'dirty'
			isDirty: function(cmdData) {
				return _validate(cmdData) && !!cmdData.func.sourcetab.dirty;
			},
			// dialog
			getDialog: function(cmdData) {
				return _validate(cmdData) && cmdData.func.Dlg;
			},
			// progress bar
			getProgressBar: function(cmdData) {
				return _validate(cmdData) && cmdData.func.command.progress;
			},

			// all - DOpus enumerables
			getAllItems: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.all;
			},
			getAllDirs: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.dirs;
			},
			getAllFiles: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.files;
			},
			// selected - DOpus enumerables
			getSelItems: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected;
			},
			getSelDirs: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected_dirs;
			},
			getSelFiles: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected_files;
			},

			// get selected file directly as item
			getSelFileAsItem: function(cmdData) {
				return _validate(cmdData) && DOpus.FSUtil.GetItem(new Enumerator(cmdData.func.sourcetab.selected_files).item());
			},

			// all items, dirs, files - selstats takes checkbox mode into account
			getAllItemsCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.items;
			},
			getAllDirsCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.dirs;
			},
			getAllFilesCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.files;
			},
			// selected items, dirs, files - selstats takes checkbox mode into account
			getSelItemsCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.selitems;
			},
			getSelDirsCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.seldirs;
			},
			getSelFilesCount: function(cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.selfiles;
			}
		}
	}());

	// not the most elegant solution, but JScript/JS does not easily allow to determine function name from a given function object
	// cannot parse 'anonymous' methods, incl. exposed method names in singletons, e.g. funcNameExtractor(actions.getFunc)
	var reFuncNameExtractor = new RegExp(/^function\s+(\w+)\(.+/);
	function funcNameExtractor(fnFunc) {
		var fnName = 'funcNameExtractor';
		if (typeof fnFunc !== 'function') {
			abortWithFatalError(sprintf('%s -- Given parameter is not a recognized function\n%s', fnName, dumpObject(fnFunc)));
		}
		var _matches = fnFunc.toString().match(reFuncNameExtractor);
		return _matches ? _matches[1] : 'Anonymous -- ' + dumpObject(fnFunc, AS_POJO).value.replace(/\n|^\s+|\s+$/mg, '');
	};

	// poor man's debugger
	function dumpObject(obj, asPOJO) {
		var out = {};
		out.type      = typeof obj;
		out.prototype = obj.prototype;
		out.value     = '';
		switch(typeof obj) {
			case 'string':
			case 'number':
			case 'boolean':
			case 'bigint':
				out.value = obj; break;
			case 'undefined':
				out.value = 'undefined'; break;
			case 'regexp':
				out.value = obj.toString(); break;
			case 'function':
				out.value = obj.toString().slice(0, 100) + ' ...cropped for brevity'; break;
				// out.value = obj.toString(); break;
			case 'object':
				if (obj === null) { out.value = 'null'; break; }
				try {
						 if (doh.isValidDOItem(obj))      { out.value = 'DOpus Item - fullpath: ' + obj.realpath; break; }
					else if (doh.isValidCommandData(obj)) { out.value = 'DOpus Command Data'; break; }
					else if (doh.isValidColumnData(obj))  { out.value = 'DOpus Column Data'; break; }
					else if (doh.isValidDOpusMap(obj))    { out.value = 'DOpus Map'; break; }
					else if (doh.isValidDOpusVector(obj)) { out.value = 'DOpus Vector'; break; }
				} catch (e) {}
				try { JSON.parse(JSON.stringify(obj, null, 4)); out.value = obj; break; } catch(e) {}
				try { var _tmp = obj.toString(); } catch(e) {}
				out.value = 'undetermined object';
				break;
			default:
				out.value = 'unknown type';
		}
		return asPOJO ? out : JSON.stringify(out, null, 4);
	}
}



/*
	888      8888888 888888b.    .d8888b.
	888        888   888  "88b  d88P  Y88b
	888        888   888  .88P  Y88b.
	888        888   8888888K.   "Y888b.
	888        888   888  "Y88b     "Y88b.
	888        888   888    888       "888
	888        888   888   d88P Y88b  d88P
	88888888 8888888 8888888P"   "Y8888P"
*/
{
	function __LIBS__(){}
	// sprintf - BEGIN
	// https://hexmen.com/blog/2007/03/14/printf-sprintf/
	{
		// from https://hexmen.com/js/sprintf.js
		/**
		 * JavaScript printf/sprintf functions.
		 *
		 * This code is unrestricted: you are free to use it however you like.
		 *
		 * The functions should work as expected, performing left or right alignment,
		 * truncating strings, outputting numbers with a required precision etc.
		 *
		 * For complex cases these functions follow the Perl implementations of
		 * (s)printf, allowing arguments to be passed out-of-order, and to set
		 * precision and output-length from other argument
		 *
		 * See http://perldoc.perl.org/functions/sprintf.html for more information.
		 *
		 * Implemented flags:
		 *
		 * - zero or space-padding (default: space)
		 *     sprintf("%4d", 3) ->  "   3"
		 *     sprintf("%04d", 3) -> "0003"
		 *
		 * - left and right-alignment (default: right)
		 *     sprintf("%3s", "a") ->  "  a"
		 *     sprintf("%-3s", "b") -> "b  "
		 *
		 * - out of order arguments (good for templates & message formats)
		 *     sprintf("Estimate: %2$d units total: %1$.2f total", total, quantity)
		 *
		 * - binary, octal and hex prefixes (default: none)
		 *     sprintf("%b", 13) ->    "1101"
		 *     sprintf("%#b", 13) ->   "0b1101"
		 *     sprintf("%#06x", 13) -> "0x000d"
		 *
		 * - positive number prefix (default: none)
		 *     sprintf("%d", 3) -> "3"
		 *     sprintf("%+d", 3) -> "+3"
		 *     sprintf("% d", 3) -> " 3"
		 *
		 * - min/max width (with truncation); e.g. "%9.3s" and "%-9.3s"
		 *     sprintf("%5s", "catfish") ->    "catfish"
		 *     sprintf("%.5s", "catfish") ->   "catfi"
		 *     sprintf("%5.3s", "catfish") ->  "  cat"
		 *     sprintf("%-5.3s", "catfish") -> "cat  "
		 *
		 * - precision (see note below); e.g. "%.2f"
		 *     sprintf("%.3f", 2.1) ->     "2.100"
		 *     sprintf("%.3e", 2.1) ->     "2.100e+0"
		 *     sprintf("%.3g", 2.1) ->     "2.10"
		 *     sprintf("%.3p", 2.1) ->     "2.1"
		 *     sprintf("%.3p", '2.100') -> "2.10"
		 *
		 * Deviations from perl spec:
		 * - %n suppresses an argument
		 * - %p and %P act like %g, but without over-claiming accuracy:
		 *   Compare:
		 *     sprintf("%.3g", "2.1") -> "2.10"
		 *     sprintf("%.3p", "2.1") -> "2.1"
		 *
		 * @version 2011.09.23
		 * @author Ash Searle
		 */
		function sprintf() {
			function pad(str, len, chr, leftJustify) {
				var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
				return leftJustify ? str + padding : padding + str;

			}

			function justify(value, prefix, leftJustify, minWidth, zeroPad) {
				var diff = minWidth - value.length;
				if (diff > 0) {
					if (leftJustify || !zeroPad) {
						value = pad(value, minWidth, ' ', leftJustify);
					} else {
						value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
					}
				}
				return value;
			}

			var a = arguments, i = 0, format = a[i++];
			return format.replace(sprintf.regex, function (substring, valueIndex, flags, minWidth, _, precision, type) {
				if (substring == '%%') return '%';

				// parse flags
				var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false;
				for (var j = 0; flags && j < flags.length; j++) switch (flags.charAt(j)) {
					case ' ': positivePrefix = ' '; break;
					case '+': positivePrefix = '+'; break;
					case '-': leftJustify = true; break;
					case '0': zeroPad = true; break;
					case '#': prefixBaseX = true; break;
				}

				// parameters may be null, undefined, empty-string or real valued
				// we want to ignore null, undefined and empty-string values

				if (!minWidth) {
					minWidth = 0;
				} else if (minWidth == '*') {
					minWidth = +a[i++];
				} else if (minWidth.charAt(0) == '*') {
					minWidth = +a[minWidth.slice(1, -1)];
				} else {
					minWidth = +minWidth;
				}

				// Note: undocumented perl feature:
				if (minWidth < 0) {
					minWidth = -minWidth;
					leftJustify = true;
				}

				if (!isFinite(minWidth)) {
					throw new Error('sprintf: (minimum-)width must be finite');
				}

				if (precision && precision.charAt(0) == '*') {
					precision = +a[(precision == '*') ? i++ : precision.slice(1, -1)];
					if (precision < 0) {
						precision = null;
					}
				}

				if (precision == null) {
					precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void (0);
				} else {
					precision = +precision;
				}

				// grab value using valueIndex if required?
				var value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];
				var prefix, base;

				switch (type) {
					case 'c': value = String.fromCharCode(+value);
					case 's': {
						// If you'd rather treat nulls as empty-strings, uncomment next line:
						// if (value == null) return '';

						value = String(value);
						if (precision != null) {
							value = value.slice(0, precision);
						}
						prefix = '';
						break;
					}
					case 'b': base = 2; break;
					case 'o': base = 8; break;
					case 'u': base = 10; break;
					case 'x': case 'X': base = 16; break;
					case 'i':
					case 'd': {
						var number = parseInt(+value);
						if (isNaN(number)) {
							return '';
						}
						prefix = number < 0 ? '-' : positivePrefix;
						value = prefix + pad(String(Math.abs(number)), precision, '0', false);
						break;
					}
					case 'e': case 'E':
					case 'f': case 'F':
					case 'g': case 'G':
					case 'p': case 'P':
						{
							var number = +value;
							if (isNaN(number)) {
								return '';
							}
							prefix = number < 0 ? '-' : positivePrefix;
							var method;
							if ('p' != type.toLowerCase()) {
								method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
							} else {
								// Count significant-figures, taking special-care of zeroes ('0' vs '0.00' etc.)
								var sf = String(value).replace(/[eE].*|[^\d]/g, '');
								sf = (number ? sf.replace(/^0+/, '') : sf).length;
								precision = precision ? Math.min(precision, sf) : precision;
								method = (!precision || precision <= sf) ? 'toPrecision' : 'toExponential';
							}
							var number_str = Math.abs(number)[method](precision);
							// number_str = thousandSeparation ? thousand_separate(number_str): number_str;
							value = prefix + number_str;
							break;
						}
					case 'n': return '';
					default: return substring;
				}

				if (base) {
					// cast to non-negative integer:
					var number = value >>> 0;
					prefix = prefixBaseX && base != 10 && number && ['0b', '0', '0x'][base >> 3] || '';
					value = prefix + pad(number.toString(base), precision || 0, '0', false);
				}
				var justified = justify(value, prefix, leftJustify, minWidth, zeroPad);
				return ('EFGPX'.indexOf(type) > -1) ? justified.toUpperCase() : justified;
			});
		}
		sprintf.regex = /%%|%(\d+\$)?([-+#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegpEGP])/g;

		/**
		 * Trival printf implementation, probably only useful during page-load.
		 * Note: you may as well use "document.write(sprintf(....))" directly
		 */
		function printf() {
			// delegate the work to sprintf in an IE5 friendly manner:
			var i = 0, a = arguments, args = Array(arguments.length);
			while (i < args.length) args[i] = 'a[' + (i++) + ']';
			document.write(eval('sprintf(' + args + ')'));
		}
	}
	// sprintf - END
}

/*
	88888888888  .d88888b.  8888888b.   .d88888b.
	    888     d88P" "Y88b 888  "Y88b d88P" "Y88b
	    888     888     888 888    888 888     888
	    888     888     888 888    888 888     888
	    888     888     888 888    888 888     888
	    888     888     888 888    888 888     888
	    888     Y88b. .d88P 888  .d88P Y88b. .d88P
	    888      "Y88888P"  8888888P"   "Y88888P"
*/
{
	function __TODO__(){}
	// TODO - DELETE
	{
		function translateCommandNameToFnName(cmdName) {
			return 'onDOpusCmd' + cmdName;
		}
		function onDOpusExportToFile_TODO_DELETE(scriptCmdData) {
			var filename = scriptCmdData.func.args.FILE;
			var oFile    = DOpus.FSUtil.GetItem(filename);
			DOpus.Output(oFile.realpath + '\tDOpus.FSUtil.Exists("' + oFile.realpath + '"): ' + DOpus.FSUtil.Exists(oFile.realpath));
		}
	}

	// TODO
	{
		/*
			TODO:
			- review startTS, stopTS... etc. and replace with stopwatch?
			- review ReadADS, SaveADS, DeleteADS outputs
			- review progress bar and switch to 'full' - 1 bar for files, 1 bar for bytes
			- IMPORT: if 1 file is selected, try to use it?
			- EXPORT: implement on-the-fly calculation and direct export
			- IMPORT: automatic path adjustment in fileExchangeHandler.convertForImportFromJSON()
			- IMPORT: better format detection in fileExchangeHandler.prepareForImport()?
		*/
	}

	// FORMATS used by ExactFile (https://www.exactfile.com/)
	{
		/*
			MD5SUM Format
			checksums.md5
				; Checksums generated by ExactFile 1.0.0.15
				; http://www.exactfile.com
				; 20.01.2021 13:33:04

				ba73ad5fc2ed01c25a420738836e432d *Subdirectory\test.txt
				; 1 files hashed.


			Extended MD5SUM format
			checksums.exf
				; Checksums generated by ExactFile 1.0.0.15
				; http://www.exactfile.com
				; 20.01.2021 13:33:35

				c7b82e264bfc6fc76696100258a7eeade8175f66 ?SHA1*Subdirectory\test.txt
				; 1 files hashed.


			SHA1SUM format
			checksums.sha1
				; Checksums generated by ExactFile 1.0.0.15
				; http://www.exactfile.com
				; 20.01.2021 13:33:22

				c7b82e264bfc6fc76696100258a7eeade8175f66 *Subdirectory\test.txt
				; 1 files hashed.


			FileCheckMD5 format
			FCMD5-sums.MD5
				; Checksums generated by ExactFile 1.0.0.15
				; http://www.exactfile.com
				; 20.01.2021 13:33:27

				ba73ad5fc2ed01c25a420738836e432d|Subdirectory\test.txt
				; 1 files hashed.


			SFV Format
			checksums.sfv
				; Checksums generated by ExactFile 1.0.0.15
				; http://www.exactfile.com
				; 20.01.2021 13:33:11

				Subdirectory\test.txt e426478a
				; 1 files hashed.
		*/
	}
}
