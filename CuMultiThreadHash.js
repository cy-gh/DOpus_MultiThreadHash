// RECOMMENDED for VSCode/VSCodium: activate 'JS/TS › Implicit Project Config: Check JS' in user settings
///<reference path="./CuMultiThreadHash.d.ts" />
// @ts-check



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
		function __GLOBAL__(){ 0 }
		var Global = {};
		Global.SCRIPT_NAME        = 'CuMultiThreadHash'; // WARNING: if you change this after initial use you have to reconfigure your columns, infotips, rename scripts...
		Global.SCRIPT_NAME_SHORT  = 'MTH'; // WARNING: if you change this after initial use you have to rename all methods!
		Global.SCRIPT_VERSION     = '0.9';
		Global.SCRIPT_COPYRIGHT   = '© 2021 cuneytyilmaz.com';
		Global.SCRIPT_URL         = 'https://github.com/cy-gh/DOpus_MultiThreadHash/';
		Global.SCRIPT_DESC        = 'Multi-Threaded hashing of selected files ';
		Global.SCRIPT_MIN_VERSION = '12.0';
		Global.SCRIPT_DATE        = '20210115';
		Global.SCRIPT_GROUP       = 'cuneytyilmaz.com';
		Global.SCRIPT_PREFIX      = Global.SCRIPT_NAME_SHORT; // prefix for field checks, log outputs, progress windows, etc. - do not touch
		Global.SCRIPT_LICENSE     = 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)';
		Global.SCRIPT_FULLPATH    = '';
		Global.SCRIPT_PATH        = '';
		Global.SCRIPT_IS_OSP      = false;

		var util = {};
		util.shell   = new ActiveXObject('WScript.shell');
		util.dopusrt = 'dopusrt /acmd';

		var sleepdur = 1; // in millisecs, used as wait between checking available # of threads & still running threads checks

		var STREAM_PREFIX = 'MTHash_';

		// TRUE is highly recommended
		var CACHE_ENABLED = true;

		// var DEFAULT_ALGORITHM = 'blake3';
		var DEFAULT_ALGORITHM = 'sha1';
		var CURRENT_ALGORITHM = DEFAULT_ALGORITHM; // TODO - might be converted to a config parameter or command parameter

		// hashing bigger files first usually increases the speed up to 25% for mixed groups of files
		// but makes little difference if file sizes are close to each other (usually few big files)
		var PROCESS_LARGEST_FILES_FIRST  = true;
		var PROCESS_SMALLEST_FILES_FIRST = false; // guaranteed to be slowe, only added because it was easy :)

		// avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack because of other overly large files
		var AVOID_OVERFILLED_KNAPSACKS = true;

		// makes very little, < 3%, difference to overall performance
		var USE_PROGRESS_BAR = true;

		// %NUMBER_OF_PROCESSORS% gives the logical number of processors, i.e. hyperthreaded ones
		// for physical core count use:
		// > WMIC CPU Get DeviceID,NumberOfCores,NumberOfLogicalProcessors
		// DeviceID  NumberOfCores  NumberOfLogicalProcessors
		// CPU0          12                  24
		var MAX_AVAILABLE_CORE_COUNT = util.shell.ExpandEnvironmentStrings("%NUMBER_OF_PROCESSORS%");

		// this must be NOT the function name but the COMMAND name!
		// we will start it via 'dopusrt /acmd <WORKER_COMMAND>...' to start the threads
		var WORKER_COMMAND = 'MTHWorker';

		// collection names for find commands & files which reported an error
		var COLLECTIONS_ENABLED          = true;
		var COLLECTION_FOR_SUCCESS       = Global.SCRIPT_NAME_SHORT + ' - ' + 'Verified hashes';
		var COLLECTION_FOR_DIRTY         = Global.SCRIPT_NAME_SHORT + ' - ' + 'Outdated hashes';
		var COLLECTION_FOR_MISSING       = Global.SCRIPT_NAME_SHORT + ' - ' + 'Missing hashes';
		var COLLECTION_FOR_ERRORS        = Global.SCRIPT_NAME_SHORT + ' - ' + 'Files with errors';
		var COLLECTION_FOR_IMPORT_ERRORS = Global.SCRIPT_NAME_SHORT + ' - ' + 'Import errors';
		var COLLECTION_FOR_VERIFY_ERRORS = Global.SCRIPT_NAME_SHORT + ' - ' + 'Verify errors';

		// show a summary dialog after manager actions
		var SHOW_SUMMARY_DIALOG = true;

		// export detailed data as comments (SHA, MD5...) or headers (JSON)
		// such as snapshot date in various formats, earliest/latest/smallest/largest file name/date, etc.
		var EXPORT_EXTENDED_DATA = true;

		// show detailed information in DOpus Output for each file after operation
		// files with errors will be put into a collection regardless of this setting
		var DUMP_DETAILED_RESULTS = false;

		// do not use both of the following; if you do "current datetime" wins
		// automatically add current date-time to generated export file names
		var APPEND_CURRENT_DATETIME_TO_EXPORT_FILES = false;
		// automatically add file with the latest date-time to generated export file names
		var APPEND_LATEST_FILE_DATETIME_TO_EXPORT_FILES = true;

		// if Export from ADS is clicked but nothing is selected, use all items in the currently displayed tab
		var EXPORT_USE_ALL_ITEMS_IF_NOTHING_SELECTED = true;
		// if Import into ADS is clicked and a single file is selected, use it as source
		var IMPORT_USE_SELECTED_FILE_AS_SOURCE = true;

		// try to determine disk type where selected files reside, i.e. HDD or SSD
		// if you are using no HDDs at all, e.g. on a laptop, no external disks, etc. there is no need to activate this
		var AUTO_DETECT_DISK_TYPE = false;
		// reduce the number of threads automatically when using an HDD
		// used only if the above is active
		var REDUCE_THREADS_ON_HDD_TO = 1;

		// ignore read-only attribute for saving ADS data
		var IGNORE_READONLY_FLAG = true;
		// ignore system attribute for saving ADS data
		var IGNORE_SYSTEM_FLAG = true;

		// self-explanatory
		// not used for anything at the moment
		var TEMPDIR = '%TEMP%';
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

	function __INIT__(){ 0 }

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


		// return;
		// cacheMgr.clearCache();
		/*
			How to initialize:

			'////////////////////////////////////////////////
			' The following options are user configurable via the Configure button under the scripts listing in Prefs
			'////////////////////////////////////////////////
			' Set DEBUG flag to True in order to enable logging messages to the Opus Output Window
			initData.config.DEBUG = False
			'////////////////////////////////////////////////
			' Set DEBUG_CLEAR flag to True in order to clear log messages from the Opus Output Window between script runs
			initData.config.DEBUG_CLEAR = False
			'////////////////////////////////////////////////
			' Set descriptions for all script options
			initData.config_desc = DOpus.NewMap("DEBUG", "Set this option to True to enable logging to the Opus script log.", _
												"DEBUG_CLEAR", "Set this option to True clear messages logged to the Opus script log between script runs.")


			How to use:

			If ((Script.config.DEBUG) Or (SCRIPT_DEBUG)) And (Script.config.DEBUG_CLEAR) Then DOpus.ClearOutput
		*/

		doh.clear();
		// put the script path, etc. into DOpus Global Vars,
		// Unfortunately initData cannot be accessed later by methods
		// even if they are put into Script.Vars, because they get cleared once the script is unloaded from memory
		// so the only safe location is not Script.Vars but DOpus.Vars
		_setScriptPathVars(initData);
		playFeedbackSound('Success'); // TODO REMOVE



		_initializeCommands(initData);
		_initializeColumns(initData);
		return false;
	}

	/**
	 * @param {object} initData DOpus InitData
	 */
	function _setScriptPathVars(initData) {
		var oItem = doh.fsu.GetItem(initData.file);
		doh.setGlobalVar('Global.SCRIPT_ITEM', oItem);
	}
	/**
	 * @returns {{fullpath: string, path: string, isOSP: boolean}}
	 */
	function _getScriptPathVars() {
		var oItem = doh.getGlobalVar('Global.SCRIPT_ITEM');
		return {
			fullpath: ''+oItem.realpath,
			path    : (''+oItem.path).normalizeTrailingBackslashes(),
			// isOSP   : (''+doh.fsu.Resolve(oItem.realpath).ext).toLowerCase() === '.osp'
			isOSP   : (''+oItem.ext).toLowerCase() === '.osp'
		}
	}
	// internal method called by OnInit() directly or indirectly
	function _getColumnLabelFor(name) {
		return '#' + name;
		return Global.SCRIPT_NAME_SHORT + ' ' + name;
	}
	// internal method called by OnInit() directly or indirectly
	function _getColumnNameFor(name) {
		return Global.SCRIPT_NAME_SHORT + '_' + name;
	}
	// internal method called by OnInit() directly or indirectly
	function _getIcon(iconName, scriptPath) {
		// helper method to get the Icon Name for development and OSP version

		var oPath = doh.fsu.Resolve(scriptPath);
		var isOSP = oPath.ext === 'osp';

		return ( isOSP
				? ('#MTHasher:' + iconName) // #MTHasher is defined in the Icons.XML file
				: (oPath.pathpart + '\\icons\\MTH_32_' + iconName + '.png')
			);
	}
	// internal method called by OnInit() directly or indirectly
	function _addCommand(name, fnFunction, initData, template, icon, label, desc, hide) {
		var cmd         = initData.AddCommand();
		cmd.name        = Global.SCRIPT_NAME_SHORT + name;
		cmd.method      = funcNameExtractor(fnFunction);
		cmd.template    = template || '';
		cmd.icon		= icon && _getIcon(icon, initData.file) || '';
		cmd.label		= label || '';
		cmd.desc        = desc || label;
		cmd.hide        = typeof hide !== 'undefined' && hide || false;
	}
	// internal method called by OnInit() directly or indirectly
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
	// internal method called by OnInit() directly or indirectly
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
			'MAXCOUNT/N,RECURSE/S'
			+ ',CALCULATE_ONLY/S,HARD_UPDATE_ADS/S,SMART_UPDATE_ADS/S,VERIFY_FROM_ADS/S,DELETE_ADS/S'
			+ ',FIND_DIRTY/S,FIND_MISSING/S'
			+ ',VERIFY_FROM/S,FILE/O,FORMAT/O'
			+ ',BENCHMARK/S,BENCHMARK_SIZE/O,BENCHMARK_COUNT/O'
			,
			'Green_SmartUpdate',
			'MTH Manager',
			'Calculates hashes of selected objects and performs an action.\nObjects can be files and folders (with RECURSE)\nUse one of the parameters to specify action.'
			);
		_addCommand('Worker',
			onDOpusCmdMTHWorker,
			initData,
			'THREADID/K,ACTIONFUNC/K,FILE/K',
			'StatusDirty',
			'MTH Worker (do not call directly!)',
			null,
			true // hide from script commands list
			);
		_addCommand('ClearCache',
			onDOpusCmdMHTClearCache,
			initData,
			'',
			'Red_DeleteADS',
			'MTH Clear Cache',
			'Clears internal cache'
			);
		_addCommand('CopyToClipboard',
			onDOpusCopyToClipboard,
			initData,
			'SKIP_PRECHECK/S',
			'Orange_CopyFromADSToClipboard',
			'MTH Copy ADS to Clipboard',
			'Copy stored ADS hashes of selected objects to clipboard'
			);
		_addCommand('ADSExportFrom',
			onDOpusADSExportFrom,
			initData,
			'SKIP_PRECHECK/S,FORMAT/K,USE_FORWARD_SLASH/S,FILE/O',
			'Orange_ExportFromADS',
			'MTH Export from ADS',
			'Exports stored ADS hashes of selected objects to a file; if filename is supplied and file exists it will be overwritten'
			);
		_addCommand('ADSImportInto',
			onDOpusADSImportInto,
			initData,
			'FORMAT/K,FILE/O',
			'Orange_ImportIntoADS',
			'MTH Import into ADS',
			'Imports hashes from selected file to ADS for all matched files by name; the current lister tab path is used to resolve relative paths'
			);
		_addCommand('OnTheFlyCalculateAndExport',
			onDOpusOnTheFlyCalculateAndExport,
			initData,
			'FORMAT/K,FILE/O',
			'Orange_OntheflyCalculateAndExport',
			'MTH On-The-Fly Calculate && Export',
			'Calculates hashes anew without using ADS; if filename is supplied and file exists it will be overwritten'
			);
		_addCommand('OnTheFlyVerifyFromFile',
			onDOpusOnTheFlyVerifyFromFile,
			initData,
			'FORMAT/K,FILE/O',
			'Orange_OntheflyCompareExternalFileToADS',
			'MTH On-The-Fly Verify (no ADS import)',
			'Verifies hashes in external file against all matched files by relative path & name; the current lister tab path is used to resolve relative paths'
			);
	}
	// internal method called by OnInit() directly or indirectly
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
			'Dirty (Simple)',
			'right', false, true, true);

		_addColumn('NeedsUpdateVerbose',
			onDOpusColMultiCol,
			initData,
			'Dirty',
			'right', false, true, true);

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
		cacheMgr.clearCache();
	}
	function onDOpusCopyToClipboard(cmdData) {
		var fnName = funcNameExtractor(onDOpusCopyToClipboard);
		var res = _getHashesOfAllSelectedFiles(cmdData, CURRENT_ALGORITHM);
		if (!res) { return; }
		doh.cmd.RunCommand('Clipboard SET ' + JSON.stringify(res, null, 4));
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
		var res1 = _getHashesOfAllSelectedFiles(cmdData, CURRENT_ALGORITHM);
		if (!res1) { return; }
		var res2 = fileExchangeHandler.exportTo(cmdData, format, filename, res1, useForwardSlash);
		if (!res2.isOK()) {
			showMessageDialog(doh.getDialog(cmdData), 'File could not be saved:\n' + res2.err, 'Save Error');
		}
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
}



/*
	8888888 888b     d888 8888888b.   .d88888b.  8888888b. 88888888888     d88P 8888888888 Y88b   d88P 8888888b.   .d88888b.  8888888b. 88888888888
	  888   8888b   d8888 888   Y88b d88P" "Y88b 888   Y88b    888        d88P  888         Y88b d88P  888   Y88b d88P" "Y88b 888   Y88b    888
	  888   88888b.d88888 888    888 888     888 888    888    888       d88P   888          Y88o88P   888    888 888     888 888    888    888
	  888   888Y88888P888 888   d88P 888     888 888   d88P    888      d88P    8888888       Y888P    888   d88P 888     888 888   d88P    888
	  888   888 Y888P 888 8888888P"  888     888 8888888P"     888     d88P     888           d888b    8888888P"  888     888 8888888P"     888
	  888   888  Y8P  888 888        888     888 888 T88b      888    d88P      888          d88888b   888        888     888 888 T88b      888
	  888   888   "   888 888        Y88b. .d88P 888  T88b     888   d88P       888         d88P Y88b  888        Y88b. .d88P 888  T88b     888
	8888888 888       888 888         "Y88888P"  888   T88b    888  d88P        8888888888 d88P   Y88b 888         "Y88888P"  888   T88b    888
*/
{
	var fileExchangeHandler = (function (){
		var myName = 'fileExchangeHandler';
		// TODO refactor this!
		/** @enum {Array} */
		var VALID_FORMATS_AND_EXTS = {
			MD5     : ['MD5',  '.md5'],
			SHA1    : ['SHA1', '.sha1'],
			JSON    : ['JSON', '.json']
		};
		var SHA1_MD5_SPLITTER = new RegExp(/^([a-zA-Z0-9]+)\b\s+\*(.+)/);
		/**
		 * @param {string} filename
		 * @returns {Result} format on success, false if unknown
		 */
		function detectFormatFromName(filename) {
			var oItem = doh.fsu.GetItem(filename);
			if (!oItem) return ResultError();
			switch(oItem.ext.toLowerCase()) {
				case VALID_FORMATS_AND_EXTS.MD5[1]:  return ResultSuccess(VALID_FORMATS_AND_EXTS.MD5[0]);
				case VALID_FORMATS_AND_EXTS.SHA1[1]: return ResultSuccess(VALID_FORMATS_AND_EXTS.SHA1[0]);
				case VALID_FORMATS_AND_EXTS.JSON[1]: return ResultSuccess(VALID_FORMATS_AND_EXTS.JSON[0]);
				default:                             return ResultError();
			}
		}
		/**
		 * sorts output by path - only needed for on the fly export
		 * @param {CommandResults} oInternalJSON
		 */
		function sortByKey(oInternalJSON) {
			var oUnsortedItems = oInternalJSON.items,
				aSortHelper    = [];
			for (var fullpath in oInternalJSON.items) {
				if (!oInternalJSON.items.hasOwnProperty(fullpath)) continue; // skip prototype functions, etc.
				aSortHelper.push(fullpath);
			}
			aSortHelper.sort();
			oInternalJSON.items = {};
			for (var i = 0; i < aSortHelper.length; i++) {
				var fullpath = aSortHelper[i];
				oInternalJSON.items[fullpath] = oUnsortedItems[fullpath];
			}
			// return oInternalJSON;
		}
		/**
		 * @param {CommandResults} oInternalJSON
		 * @returns {string}
		 */
		function convertForExportToMTHJSON(oInternalJSON) {
			return JSON.stringify(oInternalJSON, null, '\t');
		}
		/**
		 * @param {CommandResults} oInternalJSON
		 * @param {string=} format not used at the moment, all currently recognized formats use the same structure
		 * @returns {string}
		 */
		function convertForExportToClassical(oInternalJSON, format) {
			var outstr = '';
			for (var kheader in oInternalJSON) {
				if (typeof oInternalJSON[kheader] !== 'string' && typeof oInternalJSON[kheader] !== 'number') continue; // skip objects, arrays, functions...
				outstr += sprintf('; %-35s: %s', kheader.replace(/_/g, ' '), oInternalJSON[kheader]) + '\n';
				if (kheader === 'Generated_By') outstr += ';\n';
			}
			outstr += ';\n';
			if (EXPORT_EXTENDED_DATA) {
				for (var kheader in oInternalJSON.ExtInfo) {
					if (typeof oInternalJSON.ExtInfo[kheader] !== 'string' && typeof oInternalJSON.ExtInfo[kheader] !== 'number') continue; // skip objects, arrays, functions...
					outstr += sprintf('; %-35s: %s', kheader.replace(/_/g, ' '), oInternalJSON.ExtInfo[kheader]) + '\n';
				}
				outstr += ';\n';
			}
			outstr += '\n';
			for (var kitem in oInternalJSON.items) {
				if (!oInternalJSON.items.hasOwnProperty(kitem)) continue; // skip prototype stuff
				var item = oInternalJSON.items[kitem];
				outstr += item.hash + ' *' + (item.relpath || '').normalizeTrailingBackslashes() + item.name + '\n';
			}
			return outstr;
		}
		/**
		 * generic checksum file parser for sha, md5, etc.
		 * @param {string} sContents file contents
		 * @param {string} currentPath current path to use as the base
		 * @param {string=} algorithm
		 * @returns {CommandResults}
		 */
		function convertForImportFromClassical(sContents, currentPath, algorithm) {
			var fnName = myName + '.convertForImportFromClassical';

			var oHashedItemsColl = new HashedItemsCollection(),
				lines            = sContents ? sContents.split(/\n/) : [],
				hash             = '',
				relpath          = '',
				fullpath         = '',
				tsStart          = now();

			for (var i = 0; i < lines.length; i++) {
				// empty & comment lines
				var line = lines[i].trim();
				if (!line || line.indexOf(';') === 0) { continue }
				// split line to hash & relpath parts
				var lineParts = line.match(SHA1_MD5_SPLITTER);
				if (!lineParts || lineParts.length !== 3) {
					abortWithFatalError('Given file does not match expected format in line:\n' + dumpObject(line));
				}
				// find out the target full paths from current path & relative paths
				hash     = lineParts[1];
				relpath  = lineParts[2];
				fullpath = currentPath + relpath;
				logger.sverbose('%s -- Hash: %s, RelPath: %s, FullPath: %s', fnName, hash, relpath, fullpath);

				var oItem = doh.fsu.GetItem(fullpath);
				if (!doh.isValidDOItem(oItem)) {
					abortWithFatalError('Cannot get DOpus Item for: ' + fullpath);
				}
				if (!FS.isValidPath(''+oItem.realpath)) {
					oHashedItemsColl.addItem(new HashedItem(oItem, relpath, hash, algorithm, false, 'Not found: ' + oItem.realpath)); // skipped
				} else {
					oHashedItemsColl.addItem(new HashedItem(oItem, relpath, hash, algorithm));
				}
			}
			var outPOJO = new CommandResults(oHashedItemsColl, currentPath, algorithm, tsStart, now());
			return outPOJO;
		}
		/**
		 *
		 * @param {string} sContents file contents
		 * @returns {CommandResults}
		 */
		function convertForImportFromJSON(sContents) {
			var fnName = myName + '.convertForImportFromJSON';
			try {
				/** @type {CommandResults} */
				var outPOJO = JSON.parse(sContents);
				logger.snormal('%s -- outPOJO: %s', fnName, JSON.stringify(outPOJO, null, 4));
			} catch (e) {
				abortWithFatalError('Given file contents cannot be parsed as valid JSON');
			}
			if (!outPOJO.Root_Path || !isObject(outPOJO.items)) {
				abortWithFatalError('Given file contents do not match expected format, must have Root_Path & items');
			}
			if (!FS.isValidPath(outPOJO.Root_Path)) {
				abortWithFatalError('Given file contents is valid but Root Path does not exist: ' + outPOJO.Root_Path);
			}
			return outPOJO;
		}
		/**
		 * @param {object} cmdData DOpus Command data
		 * @param {string} format file format to use one of VALID_FORMATS_AND_EXTS
		 * @param {string} filename given filename, or a calculated output file name
		 * @param {CommandResults} oInternalJSONFormat internal json format
		 * @param {boolean=} useForwardSlash if / instead of \ should be used in generated output
		 * @returns {{filename: string, contents: string}}
		 */
		function prepareForExport(cmdData, format, filename, oInternalJSONFormat, useForwardSlash) {
			var fnName = myName + '.prepareForExport';

			var currentPath = doh.getCurrentPath(cmdData),
				dialog      = doh.getDialog(cmdData),
				outFilename = '';

			if (filename && typeof filename !== 'boolean') {
				// validate given filename - but we may not check for existence!
				var oItem = doh.fsu.GetItem(filename);
				if (!oItem.path) {
					oItem = doh.fsu.GetItem(currentPath + filename);
				}
				if (!oItem.path) {
					abortWithFatalError('Given filepath ' + filename + ' is not valid');
				}
				outFilename = ''+oItem.realpath;
			} else {
				// determine suggested file name & show a Save Dialog
				var defaultName = (''+currentPath).replace(/[\\:]/g, '_').replace(/_*$/, '').replace(/_+/, '_') + (useForwardSlash ? '_FS' : ''),
					nameSuffix  = APPEND_CURRENT_DATETIME_TO_EXPORT_FILES ? ' - ' + now().formatAsDateTimeCompact() :
					              APPEND_LATEST_FILE_DATETIME_TO_EXPORT_FILES ? ' - ' + oInternalJSONFormat.ExtInfo.Latest_File_DateTime_Timestamp.formatAsDateTimeCompact() : '',
					ext         = VALID_FORMATS_AND_EXTS[format.toUpperCase()][1];
				outFilename     = currentPath + defaultName + nameSuffix + ext;
				logger.snormal('%s -- currentPath: %s, Format: %s, useForwardSlash: %b, Suggested File Name: %s', fnName, currentPath, format, useForwardSlash, outFilename);

				var oPath = dialog.Save('Save As', outFilename, '*.' + ext);
				if (!oPath.result) return;
				outFilename = ''+oPath;
			}
			// sort by path
			var SORT_BY_PATH = true;
			if (SORT_BY_PATH) {
				//oInternalJSONFormat =
				sortByKey(oInternalJSONFormat);
			}


			// convert to output format
			var outContents = '';

			switch(format.toUpperCase()) {
				case VALID_FORMATS_AND_EXTS.MD5[0]:
					outContents = convertForExportToClassical(oInternalJSONFormat, VALID_FORMATS_AND_EXTS.MD5[0].toLowerCase()); break;
				case VALID_FORMATS_AND_EXTS.SHA1[0]:
					outContents = convertForExportToClassical(oInternalJSONFormat, VALID_FORMATS_AND_EXTS.SHA1[0].toLowerCase()); break;
				case VALID_FORMATS_AND_EXTS.JSON[0]:
					outContents = convertForExportToMTHJSON(oInternalJSONFormat); break;
				default:
					abortWithFatalError('Given format ' + format + ' is unknown or not yet implemented');
			}
			if (useForwardSlash) outContents = outContents.replace(/\\/mg, '/');

			logger.snormal('%s -- filename: %s', fnName, outFilename);

			return { filename: outFilename, contents: outContents };
		}
		/**
		 * @param {object} cmdData DOpus Command data
		 * @param {string=} format file format to use one of VALID_FORMATS_AND_EXTS
		 * @param {string=} filename given filename, or a calculated output file name
		 * @returns {CommandResults}
		 */
		function prepareForImport(cmdData, format, filename) {
			var fnName = myName + '.prepareForImport';

			var currentPath = doh.getCurrentPath(cmdData),
				dialog      = doh.getDialog(cmdData),
				inFilename  = '';

			var ext = format || CURRENT_ALGORITHM,
				detectedFormat;
			if (filename) {
				// validate given filename
				if(!FS.isValidPath(filename)) {
					if (!FS.isValidPath(currentPath + filename)) {
						abortWithFatalError('Given filepath ' + filename + ' is not valid');
					} else {
						inFilename = currentPath + filename;
					}
				}
			} else if (IMPORT_USE_SELECTED_FILE_AS_SOURCE && doh.getSelItemsCount(cmdData) === 1 && doh.getSelFilesCount(cmdData) === 1) {
				// if a single file is selected use it as source
				var oItem = doh.getSelFileAsItem(cmdData);
				inFilename = ''+oItem.realpath;
				logger.snormal('%s -- Using selected file as input: %s', fnName, inFilename);
				// check if file can be used
				detectedFormat = detectFormatFromName(inFilename);
				if (!detectedFormat) {
					logger.snormal('%s -- Selected file\'s format is not recognized: %s', fnName, detectedFormat);
					inFilename = '';
				}
			}
			if (!inFilename) {
				// show an Open Dialog
				var oPath = dialog.Open('Open', currentPath, '*.' + ext);
				if (!oPath.result) return;
				inFilename = ''+oPath;
			}
			logger.snormal('%s -- inFilename: %s', fnName, inFilename);

			// determine format
			if (!format) {
				detectedFormat = detectFormatFromName(inFilename);
				logger.snormal('%s -- Detected format: %s', fnName, detectedFormat);
				if (detectedFormat.isOK()) format = detectedFormat.ok;
			}
			// check if given format is valid
			detectedFormat = detectFormatFromName(inFilename);
			if (!detectedFormat.isOK()) {
				abortWithFatalError('Unrecognized format: ' + format); return; // return is needed only for tsc
			} else if (format.toLowerCase() !== detectedFormat.ok.toLowerCase()) {
				abortWithFatalError('Given filename & format do not match\nGiven: ' + format + ', Detected: ' + detectedFormat);
			}
			if (detectedFormat.ok.toUpperCase() !== CURRENT_ALGORITHM.toUpperCase()) {
				abortWithFatalError('Cannot import format ' + format + ',\ncurrent algorithm is ' + CURRENT_ALGORITHM.toUpperCase() + '.');
			}
			// read file
			var inContents = FS.readFile(inFilename);
			if (!inContents) {
				abortWithFatalError('Cannot read file: ' + inFilename); return; // return is needed only for tsc
			}

			logger.snormal('%s -- Using filename: %s, format: %s', fnName, inFilename, format);
			logger.sverbose('%s -- Input:\n%s', fnName, inContents);

			// convert to internal format and fill in values
			/** @type {CommandResults} */
			var outPOJO;
			switch(format.toUpperCase()) {
				case VALID_FORMATS_AND_EXTS.MD5[0]:
					outPOJO = convertForImportFromClassical(inContents, currentPath, VALID_FORMATS_AND_EXTS.MD5[0].toLowerCase()); break;
				case VALID_FORMATS_AND_EXTS.SHA1[0]:
					outPOJO = convertForImportFromClassical(inContents, currentPath, VALID_FORMATS_AND_EXTS.SHA1[0].toLowerCase()); break;
				case VALID_FORMATS_AND_EXTS.JSON[0]:
					outPOJO = convertForImportFromJSON(inContents); break;
				default:
					abortWithFatalError('Given format ' + format + ' is unknown or not yet implemented');
			}
			return outPOJO;
		}

		return {
			name: myName,
			/**
			 * @param {object} cmdData DOpus Command data
		 	 * @param {string} format file format to use one of VALID_FORMATS_AND_EXTS
		 	 * @param {string} filename given filename, or a calculated output file name
			 */
			importFrom: function (cmdData, format, filename) {
				var fnName = 'fileExchangeHandler.importFrom';

				var inPOJO = prepareForImport(cmdData, format, filename);

				// user aborted
				if (!inPOJO) return;
				// we have a valid POJO in internal format
				var msg    = '',
					res    = false,
					dialog = doh.getDialog(cmdData);
				if (!inPOJO.ExtInfo.Valid_Count && !inPOJO.ExtInfo.Invalid_Count) {
					msg = 'Invalid/empty format or file.\n\nNo filenames could be parsed from input file.\nCheck the format and/or file contents.\nHere is what could be parsed:\n' + JSON.stringify(inPOJO, null, 4);
					res = showMessageDialog(dialog, msg, 'Invalid/empty format or file', 'OK');
				} else if (inPOJO.ExtInfo.Valid_Count && inPOJO.ExtInfo.Invalid_Count) {
					msg = sprintf('Partial success.\n\nFiles which can imported successfully: %d\n\nFiles which cannot be imported: %d\nIf you proceed, the names will be copied to clipboard.\n\nDo you want to proceed?', inPOJO.ExtInfo.Valid_Count, inPOJO.ExtInfo.Invalid_Count);
					res = showMessageDialog(dialog, msg, 'Partial success', 'OK|CANCEL');
				} else if (!inPOJO.ExtInfo.Valid_Count && inPOJO.ExtInfo.Invalid_Count) {
					msg = sprintf('Failure!\n\nNo files can be imported successfully!\nIf the input file is valid, check if the files are under the current path.\n\nFiles which cannot be imported: %d\nIf you proceed, the names will be copied to clipboard.\n\nDo you want to proceed?', inPOJO.ExtInfo.Invalid_Count);
					res = showMessageDialog(dialog, msg, 'Failure', 'OK|Cancel');
				} else if (inPOJO.ExtInfo.Valid_Count && !inPOJO.ExtInfo.Invalid_Count) {
					msg = sprintf('Success!\n\nAll files can be imported successfully.\n\nWARNING: Existing hashes will be overwritten!\n\nDo you want to proceed?');
					res = showMessageDialog(dialog, msg, 'Success', 'OK|Cancel');
				}
				if (!res) {
					logger.snormal('%s -- User cancelled: %b ...exiting', fnName, !res);
					return; // user cancelled
				}

				var importErrors = [];
				for (var filepath in inPOJO.items) {
					if (!inPOJO.items.hasOwnProperty(filepath)) continue;
					var oItem = doh.fsu.GetItem(filepath);
					if(!ADS.save(oItem, new CachedItem(oItem, null, null, inPOJO.items[filepath].hash))) {
						importErrors.push(''+oItem.realpath);
					}
				}
				if (importErrors.length) {
					for (var i = 0; i < importErrors.length; i++) {
						var el = importErrors[i];
						logger.sforce('%s -- Error: %s', fnName, el);
					}
					addFilesToCollection(importErrors, COLLECTION_FOR_IMPORT_ERRORS);
				}
			},
			/**
			 * @param {object} cmdData DOpus Command data
		 	 * @param {string} format file format to use one of VALID_FORMATS_AND_EXTS
		 	 * @param {string} filename given filename, or a calculated output file name
			 * @returns {CommandResults}
			 */
			verifyFrom: function (cmdData, format, filename) {
				var fnName = 'fileExchangeHandler.verifyFrom';

				var inPOJO = prepareForImport(cmdData, format, filename);
				// user aborted
				if (!inPOJO) return;
				// we have a valid POJO in internal format
				if (inPOJO.ExtInfo.Invalid_Count) {
					showMessageDialog(null, 'Some files will not be verified, these will be put into collection:\n' + COLLECTION_FOR_VERIFY_ERRORS);
				}
				return inPOJO;
				// abortWithFatalError('NOT IMPL YET - Verify from external file');
			},
			/**
			 * @param {object} cmdData DOpus Command data
		 	 * @param {string} format file format to use one of VALID_FORMATS_AND_EXTS
		 	 * @param {string} filename given filename, or a calculated output file name
			 * @param {CommandResults} oInternalJSONFormat
			 * @param {boolean=} useForwardSlash
			 * @returns {Result} number of bytes written, false on error
			 */
			exportTo: function (cmdData, format, filename, oInternalJSONFormat, useForwardSlash) {
				var fnName = 'fileExchangeHandler.exportTo';
				var res1 = prepareForExport(cmdData, format, filename, oInternalJSONFormat, useForwardSlash);
				if (!res1 || !res1.filename) { return ResultError(); }
				// if the filename is not valid (e.g. just the name) use it as a relative path
				// if (!doh.getItem(res1.filename)) res1.filename = doh.getCurrentPath(cmdData) + res1.filename;
				var res2 = FS.saveFile(res1.filename, res1.contents);
				return res2 ? ResultSuccess(res2) : ResultError(res2);
			},
			isValidFormat: function (format) {
				return (format && VALID_FORMATS_AND_EXTS.hasOwnProperty(format.toUpperCase()));
			},
			isValidExtension: function (extension) {
				for (var f in VALID_FORMATS_AND_EXTS) {
					if (extension && VALID_FORMATS_AND_EXTS[f][1] === extension.toLowerCase()) return true;
				}
				return false;
			},
			getValidFormats: function () {
				var outstr = '';
				for(var k in VALID_FORMATS_AND_EXTS) {
					outstr += k + '\n';
				}
				return outstr;
			},
			detectFormatFromName: detectFormatFromName
		};
	}());

	/**
	 * @param {object} cmdData DOpus CommandData
	 * @param {string} algorithm
	 * @returns {CommandResults}
	 */
	function _getHashesOfAllSelectedFiles(cmdData, algorithm) {
		var fnName = funcNameExtractor(_getHashesOfAllSelectedFiles);

		var skipCheck = cmdData.func.args.got_arg.SKIP_PRECHECK || false,
			tsStart   = now();

		// check if tab is up-to-date
		if (doh.isTabDirty(cmdData)) {
			showMessageDialog(doh.getDialog(cmdData), 'Lister tab contents are not up-to-date, please refresh first');
			return;
		}

		// check if all files have valid hashes
		var fnFilter = filters.PUBLIC.fnFilterAcceptWithValidHashesOnly, fnFilterName = filters.getName(fnFilter);
		busyIndicator.start(cmdData.func.sourcetab, sprintf('%s -- Filter: %s', fnName, fnFilterName));
		if (EXPORT_USE_ALL_ITEMS_IF_NOTHING_SELECTED && doh.getSelItemsCount(cmdData) === 0) {
			logger.sinfo('%s -- Nothing selected, using all items', fnName);
			var itemsFiltered = applyFilterToSelectedItems(doh.getAllItems(cmdData), true, fnFilter);
		} else {
			logger.sinfo('%s -- Some items selected, using selected only', fnName);
			var itemsFiltered = applyFilterToSelectedItems(doh.getSelItems(cmdData), true, fnFilter);
		}
		busyIndicator.stop();

		// if precheck is active and some hashes are missing or dirty, show and quit
		if (!skipCheck && itemsFiltered.countSkipped) {
			showMessageDialog(doh.getDialog(cmdData), 'Some selected files are skipped,\nbecause of no or outdated hashes.\nPlease update first, e.g. via Smart Update.\n\nAlternatively, you can use\nthe Skip Check parameter (NOT RECOMMENDED)');
			return;
		}

		// check if we have any items to process further
		if (!itemsFiltered.countTotal) {
			if (doh.getSelItemsCount(cmdData)) {
				return showMessageDialog(doh.getDialog(cmdData),
					sprintf('Nothing to do, quitting...\n\nNo suitable files found for the requested\nFilter: %s', fnFilterName),
					'No suitable files found');
			} else {
				return showMessageDialog(doh.getDialog(cmdData),
					'Nothing selected',
					'Nothing selected');
			}
		}

		// everything ok, proceed
		var currentPath   = doh.getCurrentPath(cmdData),
			oSuccessItems = itemsFiltered.getSuccessItems(); // process only success items!
		for (var k in oSuccessItems) {
			if (!oSuccessItems.hasOwnProperty(k)) continue;
			var oHashedItem = oSuccessItems[k],
				oDOItem     = doh.fsu.GetItem(oHashedItem.fullpath),
				oADSData    = ADS.read(oDOItem);

			if (!oADSData) { abortWithFatalError('Cannot read stream data for: ' + oHashedItem.fullpath); return; } // return needed for VSCode/TSC

			// remove cache only fields if necessary
			cacheMgr.removeCacheFields(oADSData);
			// copy the 2 most important fields
			oHashedItem.hash      = oADSData.hash;
			oHashedItem.algorithm = oADSData.algorithm;
			// enrich with useful info
			oHashedItem.relpath   = (''+oDOItem.path).normalizeTrailingBackslashes().replace(currentPath, '');
			oHashedItem.name      = ''+oDOItem.name;
		}

		// calculate the command results and return
		var oCR = new CommandResults(itemsFiltered, doh.getCurrentPath(cmdData), algorithm, tsStart, now());
		logger.sverbose('%s -- oCR:\n%s', fnName, JSON.stringify(oCR, null, 4));
		return oCR;
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
		if (!doh.isValidDOItem(item) || !doh.isFile(item) || !FS.isValidPath(item.realpath)) return;
		// logger.sforce('%s -- item.name: %s - exists: %b', 'onDOpusColHasStream', item.name, FS.isValidPath(item.realpath));
		var res = ADS.hasHashStream(item);
		scriptColData.value = res ? 'Yes' : 'No';
		scriptColData.group = 'Has Metadata: ' + scriptColData.value;
		// return res;
	}
	function onDOpusColMultiCol(scriptColData) {
		var fnName = funcNameExtractor(onDOpusColMultiCol);

		var ts1 = new Date().getTime();

		var item = scriptColData.item;
		if (!doh.isFile(item)) return;

		// get ADS object
		var item_props = ADS.read(item);
		// if (item_props === false || typeof item_props === 'undefined' || !isObject(item_props)) {
		if (!item_props) {
			// logger.normal(item.name + ': Metadata does not exist or INVALID: ' + item_props);
			return;
		}

		// iterate over requested columns
		for (var e = new Enumerator(scriptColData.columns); !e.atEnd(); e.moveNext()) {
			var key = e.item();
			var outstr;
			switch(key) {
				case _getColumnNameFor('NeedsUpdate'):
					var differentModifDate = new Date(item.modify).valueOf() !== item_props.last_modify,
						differentSize      = parseInt(item.size, 10)         !== item_props.last_size;

					outstr = differentModifDate || differentSize ? 'Yes' : 'No';
					scriptColData.columns(key).group = 'Needs update: ' + (outstr ? 'Yes' : 'No');
					scriptColData.columns(key).value = outstr;
					break;

				case _getColumnNameFor('NeedsUpdateVerbose'):
					var differentModifDate = new Date(item.modify).valueOf() !== item_props.last_modify,
						differentSize      = parseInt(item.size, 10)         !== item_props.last_size;
					outstr = differentModifDate || differentSize ? 'Yes' : 'No';
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

	function __MANAGER__(){ 0 }
	// called by custom DOpus command
	function onDOpusCmdMTHManagerStart(cmdData) {
		var fnName = funcNameExtractor(onDOpusCmdMTHManagerStart);

		doh.clear();

		// VALIDATE PARAMETERS & SET FILTERS, ACTIONS AND COLLECTIONS
		{
			var command        = getManagerCommand(cmdData),
				commandName    = command.command,
				collectionName = command.collName,
				fnFilter       = command.filter,
				fnFilterName   = command.filterName,
				fnAction       = command.action,
				fnActionName   = command.actionName;
			logger.sforce('%s -- Selected Command: %s, Using Filter: %s, Action: %s', fnName, commandName, fnFilterName, fnActionName);
		}


		// benchmarking, runaway stoppers for while loops, progress bar abort
		var tsStart     = now(),
			itercnt     = 0,
			itermax     = Math.round(60 * 60 * 1000 / (sleepdur||1)),
			userAborted = false,
			rootPath    = doh.getCurrentPath(cmdData);


		// SELECTION & FILTERING
		{
			busyIndicator.start(cmdData.func.sourcetab, sprintf('%s -- Filter: %s, Action: %s', fnName, fnFilterName, fnActionName));
			// if (command.command === 'VERIFY_FROM' ) {
			if (fnAction === actions.PUBLIC.fnActionBenchmark) {
				hashPerformanceTest(command.benchSize, command.benchCount, command.maxcount);
				return;
				// // create temp files
				// var aGeneratedFiles = createTempFileWithSize(command.benchSize, command.benchCount, util.shell.ExpandEnvironmentStrings(TEMPDIR));
				// var selectedFiltered = new HashedItemsCollection();
				// for (var i = 0; i < aGeneratedFiles.length; i++) {
				// 	selectedFiltered.addItem(new HashedItem(doh.getItem(aGeneratedFiles[i])));
				// }
				// logger.sforce('%s -- selectedFiltered: %s', fnName, JSON.stringify(selectedFiltered, null, 4));
			} else if (fnAction === actions.PUBLIC.fnCompareAgainstHash) {
				// get the given file or user-selected file contents in internal format
				var extFileAsPOJO = fileExchangeHandler.verifyFrom(cmdData, '', command.fileName);
				if (!extFileAsPOJO.items) {
					abortWithFatalError('Nothing to do, parsing results:' + JSON.stringify(extFileAsPOJO, null, 4));
				}
				// populate the collection which will replace the typical user-selected files collection, e.g. in next block with applyFilterToSelectedItems()
				var selectedFiltered = new HashedItemsCollection();
				for (var itemPath in extFileAsPOJO.items) {
					if (!extFileAsPOJO.items.hasOwnProperty(itemPath)) continue; // skip prototype functions, etc.
					var item = extFileAsPOJO.items[itemPath];
					selectedFiltered.addItem(new HashedItem(doh.getItem(itemPath), '', item.hash, extFileAsPOJO.Algorithm));
				}
				logger.sverbose('%s -- hic:\n%s', fnName, JSON.stringify(selectedFiltered, null, 4));
			} else {
				var selectedFiltered   = applyFilterToSelectedItems(doh.getSelItems(cmdData), true, fnFilter);
			}
			var selectedItemsCount = selectedFiltered.countSuccess;
			var selectedItemsSize  = selectedFiltered.sizeSuccess;
			busyIndicator.stop();

			// if a collection name is set, we only need to show the selection & filtering results, e.g. Dirty, Missing...
			if (collectionName) {
				busyIndicator.start(cmdData.func.sourceTab, sprintf('Populating collection: %s', collectionName));
				logger.normal(stopwatch.startAndPrint(fnName, 'Populating collection', 'Collection name: ' + collectionName));

				// addFilesToCollection(selectedFiltered.getSuccessItems().keys(), collectionName);
				addFilesToCollection(getObjKeys(selectedFiltered.getSuccessItems()), collectionName);

				logger.normal(stopwatch.stopAndPrint(fnName, 'Populating collection'));
				busyIndicator.stop();
				return;
			}
			// if some hashes are missing or dirty, show and quit
			if (selectedFiltered.countSkipped && fnAction !== actions.PUBLIC.fnActionCalculateAndSaveToADS) {
				showMessageDialog(doh.getDialog(cmdData), 'Some selected files are skipped,\nbecause of no or outdated hashes.\nPlease update first, e.g. via Smart Update.');
				return;
			}
			// nothing to do
			if (!selectedItemsCount) {
				if (doh.getSelItemsCount(cmdData)) {
					showMessageDialog(doh.getDialog(cmdData),
						sprintf('Nothing to do, quitting...\n\nNo suitable files found for the requested\nCommand: %s\nFilter: %s\nAction: %s', commandName, fnFilterName, fnActionName),
						'No suitable files found');
				} else {
					showMessageDialog(doh.getDialog(cmdData),
						sprintf('Nothing selected'),
						'Nothing selected');
				}
				return;
			}
		}

		// DISK TYPE DETECTION
		{
			if (AUTO_DETECT_DISK_TYPE) {
				var driveType = detectDriveType(selectedFiltered.driveLetters);
				if (!driveType) {
					// assume SSD and continue
				} else {
					if (driveType === 'HDD' && command.maxcount > REDUCE_THREADS_ON_HDD_TO) {
						var driveDetectMsg = sprintf('This drive seems to be an %s.\n\nThe script will automatically reduce the number of threads to avoid disk thrashing.\nOld # of Threads: %d\nNew # of Threads	: %d\n\nIf you press Cancel, the old value will be used instead.\nIs this drive type correct?', driveType, command.maxcount, REDUCE_THREADS_ON_HDD_TO);
						var result = showMessageDialog(doh.getDialog(cmdData), driveDetectMsg, 'Drive Type detection', 'OK|Cancel');
						if (result && command.maxcount > 1) command.maxcount = REDUCE_THREADS_ON_HDD_TO;
					}
				}
				logger.snormal('%s -- Number of threads to use: %d', fnName, command.maxcount);
			}
		}


		// SPLITTING / KNAPSACKING
		{
			var selectedKnapsacked = knapsackItems(selectedFiltered, command.maxcount);
		}


		// INITIALIZE PROGRESS BAR
		{
			var unitMax      = selectedItemsSize.getUnit();
			var formattedMax = selectedItemsSize.formatAsSize(unitMax);
			var progbar      = initializeProgressBar(cmdData);
		}


		// INITIALIZE THREAD POOL
		{
			var tp = cacheMgr.getThreadPoolAutoInit();
			setPauseStatus(false);
			setAbortStatus(false);
		}


		// SEND SELECTED FILES TO WORKER THREADS
		{
			for (var kskey in selectedKnapsacked.unfinishedKS) {
				if (!selectedKnapsacked.unfinishedKS.hasOwnProperty(kskey)) continue; // skip prototype functions, etc.
				var ks = selectedKnapsacked.unfinishedKS[kskey];

				// prepare the variables for this knapsack's worker
				var torun = sprintf('%s %s THREADID="%s" ACTIONFUNC=%s', util.dopusrt, WORKER_COMMAND, ks.id, fnActionName);
				// logger.sforce('%s -- torun: %s', fnName, torun);
				// continue;

				// put all files in this knapsack into a map

				var filesMap = doh.dc.Map();
				var oHashedItems = ks.itemsColl.getSuccessItems();

				fileloop:for (var hikey in oHashedItems) {
					if (!oHashedItems.hasOwnProperty(hikey)) continue; // skip prototype functions, etc.
					/** @type {HashedItem} */
					var oHashedItem = oHashedItems[hikey];

					// create a new DOpus map for this file
					var new_file             = doh.dc.Map();	        // @ts-ignore
					new_file('filename')     = oHashedItem.name;		// @ts-ignore
					new_file('filepath')     = oHashedItem.fullpath;	// @ts-ignore
					new_file('filesize')     = oHashedItem.size;		// @ts-ignore
					new_file('finished')     = false; 					// @ts-ignore // if it timed out or was unfinished for any reason
					new_file('elapsed')      = 0;						// @ts-ignore
					new_file('error')        = false;					// @ts-ignore
					new_file('hash')         = false;					// @ts-ignore
					new_file('finalized')    = false; 					// @ts-ignore // if the file has been processed completely, can include timed out files
					new_file('externalAlgo') = oHashedItem.algorithm;	// @ts-ignore // if the file has been processed completely, can include timed out files
					new_file('externalHash') = oHashedItem.hash;		//  @ts-ignore // if the file has been processed completely, can include timed out files
					filesMap(oHashedItem.fullpath) = new_file;
				}
				// put this knapsack into thread pool
				cacheMgr.setThreadPoolVar(ks.id, filesMap);
				// logger.snormal('%s -- Worker command to run: %s', fnName, torun);
				doh.cmd.RunCommand(torun);
			}
		}


		// ALL THREADS STARTED - NOW MONITOR THEM
		{
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');
			logger.sforce('%s -- All workers started', fnName);
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');

			logger.force(stopwatch.startAndPrint(fnName, 'Progress Bar'));
			var ts = now();
			var finished_bytes_so_far = 0;
			unfinished: while(itercnt++ < itermax && !selectedKnapsacked.allFinished()) {
				doh.delay(sleepdur);
				for (var kskey in selectedKnapsacked.unfinishedKS) {
					if (!selectedKnapsacked.unfinishedKS.hasOwnProperty(kskey)) continue; // skip prototype functions, etc.
					var ks       = selectedKnapsacked.unfinishedKS[kskey],
						threadID = ks.id,
						ksMap    = cacheMgr.getThreadPoolVar(threadID);
					// logger.forceSprintf('%s -- KS Thread ID: %s', fnName, threadID);
					for (var e = new Enumerator(ksMap); !e.atEnd(); e.moveNext()) {
						var ksItemPath  = e.item(),           // full path is the key, as we put it in the manager
							ksItemAttrib = ksMap(ksItemPath); // map with: filename, filepath, filesize, finished, elapsed, error, result
						// logger.forceSprintf('%s -- ksItemAttrib("filename"): %s, finished: %b', fnName, ksItemAttrib('filename'), ksItemAttrib('finished'));

						// check for any unfinished files
						if (!ksItemAttrib('finished')) {
							// file not finished yet
							continue;
						} else if (ksItemAttrib('finalized')) {
							// file already finalized
							continue;
						} else {
							// EXTREMELY IMPORTANT
							// find this item in the knapsack items collection and mark it as finished
							// this automatically bubbles up from HashedItem to HashedItemsCollection to Knapsack to KnapsacksCollection
							// and that's how selectedKnapsacked.allFinished() above works!
							// ks.itemsColl.getByPath(ksItemAttrib('filepath')).markFinished();
							ks.itemsColl.getByPath(ksItemPath).markFinished();

							logger.sverbose('%s -- %-100s -- AllFinished: %s, KS Finished: %s, KS: %s', fnName, ksItemAttrib('filename'), selectedKnapsacked.allFinished(), ks.isFinished(), kskey);

							// @ts-ignore // file finished, mark it as 'finalized' so that we update its finished status only once
							ksItemAttrib('finalized') = true;

							// UPDATE THE PROGRESS BAR not for each file
							finished_bytes_so_far += ksItemAttrib('filesize');
							userAborted = updateProgressBar(progbar, tsStart, ksItemAttrib('filename'), finished_bytes_so_far, selectedItemsSize, formattedMax, unitMax);
							if (userAborted) { break unfinished; }
						}
					}
				}
			}
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');
			logger.sforce('%s -- All workers finished: %s', fnName, selectedKnapsacked.allFinished());
			// if (itercnt >= itermax && !selectedKnapsacked.allFinished()) {
			if (!selectedKnapsacked.allFinished() && itercnt >= itermax) {
				logger.sforce('');
				logger.sforce('%s -- Max Wait Reached! (itercnt/itermax: %d/%d)', fnName, itercnt, itermax);
			}
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');
			logger.force(stopwatch.stopAndPrint(fnName, 'Progress Bar'));


		}


		// LAST CLEANUP ACTIONS
		{

			doh.delay(10);
			finalizeProgressBar(progbar);
			var tsFinish = now();
			// following is only for cosmetical reasons
			// wait for DOpus to output the last 'Script Completed' lines
			// otherwise DOpus might show a 'Script Completed' in the middle of our outputs below

			doh.delay(500);
			// doh.clear();
		}


		// PREPARE RESULTS OBJECT
		// results ready, all threads finished/timed out
		// convert the KnapsacksCollection object to a new CommandResults object
		// these 2 objects are normally not directly compatible
		// since actionResults works using multiple threads/knapsacks and DOpus maps for information exchange between manager & workers
		// whereas HashedItemCollection has a flattened structure with simple JavaScript objects
		var oCommandResults = selectedKnapsacked.getAsCommandResults(rootPath, CURRENT_ALGORITHM, tp, tsStart, tsFinish)


		// SUCCESS & ERROR COLLECTIONS
		{
			if (COLLECTION_FOR_SUCCESS || COLLECTION_FOR_ERRORS) {
				if (COLLECTION_FOR_SUCCESS && oCommandResults.ExtInfo.Valid_Count)  addFilesToCollection(getObjKeys(oCommandResults.items), COLLECTION_FOR_SUCCESS);
				if (COLLECTION_FOR_ERRORS && oCommandResults.ExtInfo.Invalid_Count) addFilesToCollection(getObjKeys(oCommandResults.error), COLLECTION_FOR_ERRORS);
			}
		}


		// doh.clear();
		// ON-THE-FLY EXPORT AND ALIKE
		{
			if (command.fileName || command.fileFormat) {
				var saveResult = fileExchangeHandler.exportTo(cmdData, command.fileFormat||CURRENT_ALGORITHM, command.fileName, oCommandResults, false);
				if (!saveResult.isOK()) {
					showMessageDialog(doh.getDialog(cmdData), 'File could not be saved:\n' + saveResult.err, 'Save Error');
				}
			}
		}


		// a not so fortunate experiment - I did not like how it looks and seems to be over-complicating things
		// TODO maybe I'll come back to this later
		/*
			doh.loadResources(SCRIPT_RESOURCES.SummaryDialog);
			var dlg = doh.getDialog(cmdData);
			dlg.window   = cmdData.func.sourcetab;
			dlg.template = 'SummaryDialog';
			dlg.detach   = true;
			dlg.Show();

			dlg.Control('txtOperation').value                 = command.command;
			dlg.Control('txtStart').value                     = actionResults.summary.tsstart.formatAsHms();
			dlg.Control('txtFinish').value                    = actionResults.summary.tsfinish.formatAsHms();
			dlg.Control('txtSuccess').value                   = '???';
			dlg.Control('txtErrors').value                    = actionResults.summary.errors;
			dlg.Control('txtSkipped').value                   = actionResults.summary.unfinished;

			dlg.Control('txtMaxElapsedPerThreadSize').value   = actionResults.summary.maxelapsedthread + ' ms (' + actionResults.summary.maxelapsedthread.formatAsDuration() + ' s)';
			dlg.Control('txtMaxElapsedPerFileName').value     = actionResults.summary.longestfilename;
			dlg.Control('txtMaxElapsedPerFileSize').value     = actionResults.summary.longestfilesize + ' B (' + actionResults.summary.longestfilesize.formatAsSize() + ')';
			dlg.Control('txtMaxElapsedPerFileDuration').value = actionResults.summary.maxelapsedfile + ' s (' + actionResults.summary.maxelapsedfile.formatAsDuration() + ' s)';
			dlg.Control('txtTotalFilesAfterFiltering').value  = actionResults.summary.totalfiles;
			dlg.Control('txtTotalSizeAfterFiltering').value   = actionResults.summary.totalsize + ' B (' + actionResults.summary.totalsize.formatAsSize() + ')';
			dlg.Control('txtTotalElapsed').value              = actionResults.summary.totalelapsed + ' ms (' + actionResults.summary.totalelapsed.formatAsDuration() + ' s)';
			dlg.Control('txtAverageSpeed').value              = actionResults.summary.avgspeed.formatAsSize() + '/s';
		*/

		// FROM THIS POINT ON, DO WHAT YOU WANT...
		{
			var oSummaries = oCommandResults.getSummaries(fnName, userAborted, DUMP_DETAILED_RESULTS);
			logger.force(oSummaries.successSummary);
			logger.force(oSummaries.errorsSummary);
			if (SHOW_SUMMARY_DIALOG) {
				// show an overall summary message as dialog if you like
				showMessageDialog(
					doh.getDialog(cmdData),
					oSummaries.successSummary.replace(/,\s+/mg, '\n').replace(fnName + ' ', ''),
					Global.SCRIPT_NAME + ' - Results');
			} else {
				playFeedbackSound('Success');
			}
		}

	}
	/**
	 * @param {object} cmdData DOpus command data
	 * @returns {ManagerCommand} manager command with attribs: maxcount, recurse, command, filter, action...
	 */
	function getManagerCommand(cmdData) {
		var fnName = funcNameExtractor(getManagerCommand);

		var cargs     = cmdData.func.args;
		var recurse   = cargs.got_arg.RECURSE || true;              // if dirs are selected process children files
		var maxcount  = cargs.MAXCOUNT || MAX_AVAILABLE_CORE_COUNT; // maxiumum number of threads, default: all available
		var file      = cargs.FILE || false;                        // file to use for on-the-fly export & verify
		var format    = cargs.FORMAT || false;                      // file format to use for on-the-fly export (but not verify)
		var benchsize = cargs.BENCHMARK_SIZE || Math.pow(2, 16);    // input size for benchmarking, 2^10: 1 KB, 2^20: 1 MB...
		var benchcount= cargs.BENCHMARK_COUNT || 500;                // number of benchmarking iterations per algorithm -> this many files of specified size will be created under TEMPDIR


		var VALID_SWITCHES = {
			'CALCULATE_ONLY'         : { filter: filters.PUBLIC.fnFilterAcceptAnyFile,             action: actions.PUBLIC.fnActionCalculateOnly },
			'HARD_UPDATE_ADS'        : { filter: filters.PUBLIC.fnFilterAcceptAnyFile,             action: actions.PUBLIC.fnActionCalculateAndSaveToADS    },
			'SMART_UPDATE_ADS'       : { filter: filters.PUBLIC.fnFilterAcceptMissingOrDirty,      action: actions.PUBLIC.fnActionCalculateAndSaveToADS    },
			'VERIFY_FROM_ADS'        : { filter: filters.PUBLIC.fnFilterAcceptWithValidHashesOnly, action: actions.PUBLIC.fnActionCalculateAndCompareToADS },
			'DELETE_ADS'             : { filter: filters.PUBLIC.fnFilterAcceptWithHashes,          action: actions.PUBLIC.fnActionDeleteADS                },
			'FIND_DIRTY'             : { filter: filters.PUBLIC.fnFilterAcceptDirtyOnly,           action: actions.PUBLIC.fnActionNull,                   collectionName: COLLECTION_FOR_DIRTY},
			'FIND_MISSING'           : { filter: filters.PUBLIC.fnFilterRejectWithHashes,          action: actions.PUBLIC.fnActionNull,                   collectionName: COLLECTION_FOR_MISSING},
			// 'COPY_TO_CLIPBOARD'      : { filter: filters.PUBLIC.fnFilterRejectAnyFile,             action: actions.PUBLIC.fn_NOT_IMPLEMENTED_YET },
			'VERIFY_FROM'            : { filter: filters.PUBLIC.fnFilterAcceptAnyFile,             action: actions.PUBLIC.fnCompareAgainstHash             },
			'BENCHMARK'              : { filter: filters.PUBLIC.fnFilterAcceptAnyFile,             action: actions.PUBLIC.fnActionBenchmark                }
		};

		for (var sw in VALID_SWITCHES) {
			if (cargs.got_arg[sw]) {
				var ma = new ManagerCommand(sw, recurse, maxcount, VALID_SWITCHES[sw].filter, VALID_SWITCHES[sw].action, VALID_SWITCHES[sw].collectionName, '');
				if (file)       ma.fileName   = file;   // do not add filename unless given
				if (format)     ma.fileFormat = format; // do not add format unless given
				if (benchsize)  ma.benchSize  = benchsize;
				if (benchcount) ma.benchCount = benchcount;
				logger.snormal('%s -- Selected Action: %s, Using Filter: %s, Action: %s, Collection: %s, Filename: %s, Format: %s', fnName, sw, ma.filterName, ma.actionName, ma.collName, ma.fileName, ma.fileFormat);
				return ma;
			}
		}
		abortWithFatalError(sprintf('%s -- No valid command is given', fnName));
	}
	/**
	 * @param {string[]} filepathsArray JS array, line item objects must be file paths
	 * @param {string} collectionName collection name to add to
	 */
	function addFilesToCollection(filepathsArray, collectionName) {
		if (!COLLECTIONS_ENABLED) return;

		if (!collectionName) abortWithFatalError('No collection name is supplied, check script');
		doh.cmd.RunCommand('Delete FORCE QUIET "coll://' + collectionName + '"');
		doh.cmd.RunCommand('CreateFolder "coll://' + collectionName + '"');
		doh.cmd.ClearFiles();
		for (var i = 0; i < filepathsArray.length; i++) {
			doh.cmd.AddFile(doh.fsu.GetItem(filepathsArray[i]));
		}
		doh.cmd.RunCommand('Copy COPYTOCOLL=member FILE TO "coll://' + collectionName + '"');
		doh.cmd.RunCommand('Go "coll://' + collectionName + '" NEWTAB=findexisting');
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

	function __WORKER__(){ 0 }
	// called by onDOpusCmdMTHManager - do not call directly
	/**
	 * called by onDOpusCmdMTHManager - do not call directly
	 * @param {object} cmdData DOpus command data
	 */
	function onDOpusCmdMTHWorker(cmdData) {
		var fnName = funcNameExtractor(onDOpusCmdMTHWorker);

		var param = {
			threadID   : cmdData.func.args.THREADID,
			actionfunc : cmdData.func.args.ACTIONFUNC
		}
		logger.info(stopwatch.startAndPrint(fnName + ' ' + param.threadID, '', sprintf('threadID %s, action: %s', param.threadID, param.actionfunc) ));

		// convert function name to function
		var fnActionFunc = actions.getFunc(param.actionfunc);

		// check the thread pool
		var ksMap = cacheMgr.getThreadPoolVar(param.threadID);
		if(!ksMap) {
			abortWithFatalError('The thread info was not received with given threadID!\nThis should never have happened!');
		}

		// variable to query if user has aborted via progress bar or not
		var aborted = false;
		var filesCount = 0;

		filesloop: for (var e = new Enumerator(ksMap); !aborted && !e.atEnd(); e.moveNext()) {
			var ksItemPath   = e.item(),          // full path is the key, as we put it in the manager
				ksItemAttrib = ksMap(ksItemPath); // map with: filename, filepath, filesize, finished, elapsed, error, result, externalAlgo, externalHash
			logger.sverbose('%s -- ksItemPath: %s, ksItemAttrib.name: %s, ksItemAttrib.size: %15d', fnName, ksItemPath, ksItemAttrib('filename'), ksItemAttrib('filesize') );

			// if the manager sets the pause or abort status, honor it
			while(getPausedOrAborted() === true) {
				while(getPauseStatus() === true) {
					// already started hashing jobs won't be affected, obviously
					doh.delay(500); // doesn't need to be too short, pause is pause
					doh.out('Waiting...');
				}
				if (getAbortStatus() === true) {
					logger.sforce('%s -- Aborting...', fnName);
					aborted = true;
					break filesloop;
				}
			}

			// call the hash calculator
			stopwatch.start(fnName + ksItemPath);
			var oItem = doh.fsu.GetItem(ksItemAttrib('filepath'));
			// EXTREMELY IMPORTANT: this is the heart of actions, uglier alternative: (param.actionfunc)(oItem, null);
			/** @type {Result} */
			var newHashResult = fnActionFunc.call(fnActionFunc, oItem, ksItemAttrib('externalHash'), ksItemAttrib('externalAlgo'));
			var elapsed = stopwatch.stop(fnName + ksItemPath);
			logger.sverbose('%s       -- %-100s', fnName, ksItemAttrib('filename'));

			// put the results back to map, and the map back to TP
			// @ts-ignore
			ksItemAttrib('finished') = true;
			// @ts-ignore
			ksItemAttrib('elapsed')  = elapsed;
			// @ts-ignore
			ksItemAttrib('result')   = newHashResult.isOK() ? newHashResult.ok : false;
			// @ts-ignore
			ksItemAttrib('error')    = newHashResult.isOK() ? false : newHashResult.err;
			// @ts-ignore
			ksMap(ksItemPath) = ksItemAttrib;
			cacheMgr.setThreadPoolVar(param.threadID, ksMap);

			filesCount++;
		}
		logger.normal(stopwatch.stopAndPrint(fnName + ' ' + param.threadID, '', sprintf('threadID: %s, items: %s, aborted: %b', param.threadID, filesCount, aborted)));
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

	function __FILTERING__(){ 0 }
	/**
	 * 	output structure
	 * 	{
	 * 		totalsize: number of bytes,
	 * 		items: array of [ { 'path': string, 'name': string, 'size': number }, ... ]
	 * 	}
	 *
	 * @param {object} enumerableItems DOpus enumerable items, e.g. scriptCmdData.func.sourcetab.selected
	 * @param {boolean} recurse process subdirs
	 * @param {function} fnItemFilter function to select only certain items
	 * @returns {HashedItemsCollection} filtered items
	 * @example applyFilterToSelectedItems(doh.getAllItems(cmdData), true, filters.PUBLIC.fnFilterAcceptWithValidHashesOnly)
	 */
	function applyFilterToSelectedItems(enumerableItems, recurse, fnItemFilter) {
		var fnName = funcNameExtractor(applyFilterToSelectedItems);

		// max # of files directly in a subdir, acts also against infinite while-loop if enum.complete goes wrong
		var icnt, imax = 100000;
		// PRESELECT ALL FILES
		{
			var oItemsPreFilter = new HashedItemsCollection();

			logger.normal(stopwatch.startAndPrint(fnName, 'File Selection'));
			// first collect all the path & size information for the selected items
			// note we pass an 'enumerableItems' which is most likely passed from scriptCmdData.func.sourcetab.selected
			for (var e = new Enumerator(enumerableItems); !e.atEnd(); e.moveNext()) {
				var selitem = e.item();

				if (!doh.isDirOrFile(selitem)) {
					// type: unsupported
					logger.swarn('Skipping unsupported item: %s', selitem.realpath);
					continue;
				} else if (doh.isDir(selitem) && recurse) {
					// type: directory
					var fEnum = doh.fsu.ReadDir(selitem, (recurse && 'r'));
					if (fEnum.error) abortWithFatalError('util.fu.ReadDir cannot read dir:\n' + selitem.realpath + '\nError: ' + fEnum.error);
					icnt = 0; // just as a precaution for while loop
					while (!fEnum.complete && icnt++ < imax) {
						var subitem = fEnum.next();
						if (!doh.isFile(subitem) && doh.isValidDOItem(subitem)) continue;
						oItemsPreFilter.addItem(new HashedItem(subitem));
					}
					fEnum.Close();
				} else {
					// type: file
					oItemsPreFilter.addItem(new HashedItem(selitem));
				}
			}
			logger.normal(stopwatch.stopAndPrint(fnName, 'File Selection'));
		}

		// COLLECT FILES USING GIVEN FILTER
		// WARNING: fnItemFilter runs after all files are selected, not during the determination of files
		{
			var oItemsPostFilter = new HashedItemsCollection();
			// apply filter to all candidates

			logger.normal(stopwatch.startAndPrint(fnName, 'Filtering'));
			var oSuccessItems = oItemsPreFilter.getSuccessItems();
			for (var key in oSuccessItems) {
				if (!oSuccessItems.hasOwnProperty(key)) continue; // skip prototype functions, etc.
				if (!(fnItemFilter.call(fnItemFilter, oSuccessItems[key].item ))) { // IMPORTANT: this is the heart of filters
					logger.sinfo('%s -- Filtering out %s', fnName, oSuccessItems[key].name);
					oSuccessItems[key].skipped = true;
				}
				oItemsPostFilter.addItem(oSuccessItems[key]);
			}

			logger.normal(stopwatch.stopAndPrint(fnName, 'Filtering'));
		}

		logger.sverbose('%s -- oItemsPostFilter JSON: %s', fnName, JSON.stringify(oItemsPostFilter, null, 4));
		return oItemsPostFilter;
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

	function __KNAPSACKING__(){ 0 }
	/**
	 * Distributes given items to the requested/available knapsacks
	 *
	 * @param {HashedItemsCollection} oHashedItemsCollection JS array, e.g. results after filtering
	 * @param {number} numThreads maximum number of threads/knapsacks to use, default: all available cores
	 * @returns {KnapsacksCollection} knapsacked items
	 */
	function knapsackItems(oHashedItemsCollection, numThreads) {
		var fnName = funcNameExtractor(knapsackItems);

		logger.normal(stopwatch.startAndPrint(fnName, 'Knapsacking'));

		numThreads = typeof numThreads === 'number' && numThreads >= 1 ? numThreads : MAX_AVAILABLE_CORE_COUNT;
		// SPLIT FILES INTO KNAPSACKS
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
			var maxNeeded = Math.min(oHashedItemsCollection.countSuccess, numThreads);

			// create the collection
			var outObj = new KnapsacksCollection(now().toString());

			// we will not use a knapsack algorithm in the classical sense per se
			// since we do not have 2+ competing factors, but only 1: size, size, size! (that's still 1)
			// thus we will implement a cheapass knapsack algorithm but a very fast one to compute

			// calculate the ideal knapsack size
			var idealKnapsackSize = Math.ceil(oHashedItemsCollection.sizeSuccess / maxNeeded);       // e.g. 24 MB over 24 threads = 1 MB... ideally!

			// at the very max each knapsack will have this many elements
			var knapsackMaxElements = Math.ceil(oHashedItemsCollection.countSuccess / maxNeeded);    // e.g. 246 files over 24 threads = max 11 items per knapsack

			logger.sforce('\t%s -- Knapsack Count: %d, Ideal Max Elements/Knapsack: %d (%d*%d=%d >= %d), Ideal Size: %d (%s)',
				fnName,
				maxNeeded,
				knapsackMaxElements,
				maxNeeded,
				knapsackMaxElements,
				maxNeeded*knapsackMaxElements,
				oHashedItemsCollection.countSuccess,
				idealKnapsackSize,
				idealKnapsackSize.formatAsSize());

			// initialize individual knapsacks
			/** @type {Knapsack[]} */
			var ksArray = [];
			for (var i = 0; i < maxNeeded; i++) {
				ksArray.push(new Knapsack(getNewThreadID()));
			}
		}



		// start allocating files to knapsacks
		var oAllItems = oHashedItemsCollection.getSuccessItems();

		/** @type {Array.<HashedItem>} */
		var aAllItemsSorted = [];
		for (var key in oAllItems) {
			if (!oAllItems.hasOwnProperty(key)) continue; // skip prototype functions, etc.
			aAllItemsSorted.push(oAllItems[key]);
		}

		if (PROCESS_LARGEST_FILES_FIRST||PROCESS_SMALLEST_FILES_FIRST) {


			// NEW LOGIC - SORTED BY SIZE
			// NOT SURE THIS IS ANY FASTER THAN OLD ONE

			aAllItemsSorted.sort(function(oHI1, oHI2){
				if (PROCESS_SMALLEST_FILES_FIRST) return oHI1.size - oHI2.size; // smallest first
				if (PROCESS_LARGEST_FILES_FIRST)  return oHI2.size - oHI1.size; // largest first
			});
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');
			logger.sforce('');


			var ksNextStartingPoint = 0, ksPointerUnderCapacity = 0;
			knapsackAllocLoop: for (var kal = 0; kal < aAllItemsSorted.length; kal++) {
				var oHashedItem = aAllItemsSorted[kal];

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
				// ...now you know
				//

				var nextKS = Math.max(ksNextStartingPoint, ksPointerUnderCapacity);
				var ks = ksArray[nextKS];
				// logger.sforce('%s -- ksPointerOverCapacity: %2d -- ksPointerUnderCapacity: %2d ==> next KS: %d, KS.size: %d', fnName, ksNextStartingPoint, ksPointerUnderCapacity, nextKS, ks.size);

				ks.addItem(oHashedItem);
				ksPointerUnderCapacity++;
				if (ks.size >= idealKnapsackSize) {
					// logger.sforce('%s -- This one [%d] is full now: %d - Was before: %s (undercap: %b) and I added: %s', fnName, nextKS, ks.size, ks.size-oHashedItem.size, (ks.size-oHashedItem.size <= idealKnapsackSize), oHashedItem.size);
					logger.sforce('%s -- This one [%2d] is full now: %d - Was before: %s (undercap: %b) and I added: %s', fnName, nextKS, ks.size.formatAsSize(), (ks.size-oHashedItem.size).formatAsSize(), (ks.size-oHashedItem.size <= idealKnapsackSize), oHashedItem.size.formatAsSize());
					ksNextStartingPoint = nextKS + 1;
					// logger.sforce('\t%s -- ksPointerOverCapacity: %2d -- ksPointerUnderCapacity: %2d ==> next KS: %d, KS.size: %d', fnName, ksNextStartingPoint, ksPointerUnderCapacity, nextKS, ks.size);
				}
				ksPointerUnderCapacity = ksPointerUnderCapacity % maxNeeded;
				if (ksPointerUnderCapacity < ksNextStartingPoint) {
					ksPointerUnderCapacity = ksNextStartingPoint;
				}

			}


		} else {

			// OLD LOGIC - RANDOMLY SORTED INPUTS
			logger.normal(stopwatch.startAndPrint(fnName + ' -- 1st Stage', sprintf('Count: %d, Size: %d, Num Threads: %d', oHashedItemsCollection.countSuccess, oHashedItemsCollection.sizeSuccess, numThreads)));

			// knapsackAllocLoop: for (var key in oAllItems) {
			// 	if (!oAllItems.hasOwnProperty(key)) continue; // skip prototype functions, etc.
			// 	var oHashedItem = oAllItems[key];
			knapsackAllocLoop: for (var kal = 0; kal < aAllItemsSorted.length; kal++) {
				var oHashedItem = aAllItemsSorted[kal];

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
				// ...now you know
				//
				for (var i = 0; i < maxNeeded; i++) {
					var ks = ksArray[i];
					if (ks.size  + oHashedItem.size <= idealKnapsackSize) {
						// we found a home for this item
						ks.addItem(oHashedItem); continue knapsackAllocLoop;
					}
				}

				// file did not fit into any knapsack
				// if a file size is larger than ideal capacity, we put it into first knapsack with least items
				var minimumItemsFound = knapsackMaxElements;
				var minimumFilledKnapsackNumber = -1;
				for (var i = 0; i < maxNeeded; i++) {
					var ks = ksArray[i];
					if (ks.count < minimumItemsFound){
						minimumItemsFound = ks.count;
						minimumFilledKnapsackNumber = i;
					}
				}
				if (minimumFilledKnapsackNumber != -1) {
					ksArray[minimumFilledKnapsackNumber].addItem(oHashedItem);
				} else {
					var msg = sprintf('%s -- THIS SHOULD HAVE NEVER HAPPENED - Found no home for file: %s, size: %d', fnName, oHashedItem['path'], oHashedItem['size']);
					abortWithFatalError(msg);
				}
			}
			logger.normal(stopwatch.stopAndPrint(fnName + ' -- 1st Stage'));

			// OPTIONAL - avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack
			logger.normal(stopwatch.startAndPrint(fnName + ' -- 2nd Stage', sprintf('Count: %d, Size: %d, Num Threads: %d', outObj.countTotal, outObj.sizeTotal, numThreads)));
			{
				if (AVOID_OVERFILLED_KNAPSACKS) {
					// optional: avoid 1 overfilled but under-capacity knapsack and 1 empty knapsack, because of 1 other over-limit knapsack
					// this does not reduce the file size in this knapsack much, but the file count noticably
					// and might help reduce the file access time overhead in this thread
					// the Robin Hood algorithm!
					var underfilledKS = -1;
					var iter = 0, iterMax = maxNeeded;
					while(underfilledKS === -1 && iter++ < iterMax) {
						// determine underfilled and overfilled as long as there are empty knapsacks
						var overfilledKS = -1, currentMax = -1;
						for (var i = 0; i < maxNeeded; i++) {
							var ks = ksArray[i];
							if (currentMax < ks.count && ks.size <= idealKnapsackSize ) {
								currentMax = ks.count;
								overfilledKS = i;
							}
							if (ks.count === 0) {
								underfilledKS = i;
							}
						}
						// there are still underfilled & overfilled knapsacks
						if (overfilledKS !== -1 && underfilledKS !== -1) {
							logger.sinfo('\t%s -- Overfilled & underfilled found - Before: Overfilled (#%02d: %d) --> Underfilled (#%02d: %d)', fnName, overfilledKS, ksArray[overfilledKS].count , underfilledKS, ksArray[underfilledKS].count);

							// move items from overfilled to underfilled
							var oOverfilledItems = ksArray[overfilledKS].itemsColl.getItems();
							var i = 0, iMax = Math.floor(getObjKeys(oOverfilledItems).length / 2);
							for (var key in oOverfilledItems) {
								if (i++ > iMax) break;
								if (!oOverfilledItems.hasOwnProperty(key)) continue; // skip prototype functions, etc.
								var oHashedItem = oOverfilledItems[key];
								ksArray[overfilledKS].delItem(oHashedItem);
								ksArray[underfilledKS].addItem(oHashedItem);
							}
							logger.sinfo('\t%s -- Overfilled & underfilled found - After : Overfilled (#%02d: %d) --> Underfilled (#%02d: %d)', fnName, overfilledKS, ksArray[overfilledKS].count , underfilledKS, ksArray[underfilledKS].count);
						}
						underfilledKS = 0;
						for (var i = 0; i < maxNeeded; i++) {
							var ks = ksArray[i];
							if (ks.count === 0) {
								underfilledKS = -1;
							}
						}
					}
				}
			}
			logger.normal(stopwatch.stopAndPrint(fnName + ' -- 2nd Stage'));
		}




		logger.normal(stopwatch.startAndPrint(fnName + ' -- 3rd Stage', 'Filling knapsack collection'));
		var ksColl = new KnapsacksCollection(now().toString());
		for (var i = 0; i < ksArray.length; i++) {
			var ks = ksArray[i];
			logger.sforce('\t%s -- i: %2d, id: %s, ksCount: %7d, ksSize: %15d / %s (ideal %+15d / %s)', fnName, i, ks.id, ks.count, ks.size, ks.size.formatAsSize(), (ks.size - idealKnapsackSize), (ks.size - idealKnapsackSize).formatAsSize());
			ksColl.addKnapsack(ksArray[i]);
		}
		logger.normal(stopwatch.stopAndPrint(fnName + ' -- 3rd Stage'));

		// FS.saveFile('Y:\\ksColl.json', JSON.stringify(ksColl, null, 4));

		// SANITY CHECK - NO FILE GETS LEFT BEHIND!
		{
			if (ksColl.countTotal !== oHashedItemsCollection.countSuccess || ksColl.sizeTotal !== oHashedItemsCollection.sizeSuccess) {
			 	abortWithFatalError(
					sprintf('%s -- Some items could not be placed in knapsacks!\nInCount/OutCount: %d/%d\nInSize/OutSize: %d/%d', fnName,
					oHashedItemsCollection.countSuccess, ksColl.countTotal,
					oHashedItemsCollection.sizeSuccess, ksColl.sizeTotal));
			}
		}

		logger.normal(stopwatch.stopAndPrint(fnName, 'Knapsacking', 'Integrity check passed'));
		return ksColl;
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

	function __LOGGER__(){ 0 }
	var logger = (function () {
		/** @enum {number} */
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
		}
		function _getLevel() {
			if (typeof _level === 'undefined') {
				_level = VALID_LEVELS.ERROR;
			}
			return _level;
		}
		function _baseout(level, message) {
			if (level <= _level) doh.out(message);
		}
		return {
			levels: VALID_LEVELS,
			raw: function (message) {
				doh.out(message); // basically the same as force, but without the level check
			},
			force: function (message) {
				_baseout(-1, message);
			},
			error: function (message) {
				_baseout(this.levels.ERROR, message);
			},
			warn: function (message) {
				_baseout(this.levels.WARN, message);
			},
			normal: function (message) {
				_baseout(this.levels.NORMAL, message);
			},
			info: function (message) {
				_baseout(this.levels.INFO, message);
			},
			verbose: function (message) {
				_baseout(this.levels.VERBOSE, message);
			},
			sforce: function () {
				_baseout(-1, sprintf.apply(sprintf, arguments));
			},
			serror: function () {
				_baseout(this.levels.ERROR, sprintf.apply(sprintf, arguments));
			},
			swarn: function () {
				_baseout(this.levels.WARN, sprintf.apply(sprintf, arguments));
			},
			snormal: function () {
				_baseout(this.levels.NORMAL, sprintf.apply(sprintf, arguments));
			},
			sinfo: function () {
				_baseout(this.levels.INFO, sprintf.apply(sprintf, arguments));
			},
			sverbose: function () {
				_baseout(this.levels.VERBOSE, sprintf.apply(sprintf, arguments));
			},
			setLevel: function (level) {
				_setLevel(level);
			},
			getLevel: function () {
				return _getLevel();
			},
			getKeys: function () {
				var keys = [];
				for (var k in this.levels) {
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

	function __FILE_ACCESS__(){ 0 }
	var FS = (function (){
		var myName = 'FS';
		/** @enum {number} */
		var TEXT_ENCODING = { utf8: 1, utf16: 2 };
		return {
			name: myName,
			TEXT_ENCODING: TEXT_ENCODING,
			/**
			 * reads requested file contents (incl. ADS streams)
			 * is compatible with extremely long paths, incl. > 255 chars
			 *
			 * DO NOT PASS QUOTES, SINGLE OR DOUBLE - they will be automatically added
			 *
			 * for format not all of "base64", "quoted", "auto"=not supplied, "utf-8", "utf-16", "utf-16-le", "utf-16-be" do work
			 * the only ones which worked reliably in my tests are utf-8 & utf-16, since they're the only ones Blob.CopyFrom() supports
			 * @example
			 * contents = FS.readFile("Y:\\MyDir\\myfile.txt", FS.TEXT_ENCODING.utf16);
			 * contents = FS.readFile("Y:\\MyDir\\myfile.txt:SecondStream", FS.TEXT_ENCODING.utf8);
			 * @param {string} path file path to read, e.g. "Y:\\Path\\file.txt" or "Y:\\Path\\file.txt:CustomMetaInfo" for ADS
			 * @param {number=} format use one of {TEXT_ENCODING.utf8} or {TEXT_ENCODING.utf16}
			 * @returns {string|false} file contents, false on error
			 * @see TEXT_ENCODING
			 */
			readFile: function (path, format) {
				var fnName = 'FS.readFile';

				var decformat = format === TEXT_ENCODING.utf16 ? 'utf-16' : 'utf-8';

				if (!this.isValidPath(path)) { return false; }

				var fh = doh.fsu.OpenFile(path); // default read mode
				if(fh.error !== 0) {
					logger.serror('%s -- OpenFile error, file exists but cannot be read - error: %s, file: %s', fnName, fh.error, path);
					return false;
				}
				try {
					var blob = fh.Read();
					logger.sverbose('%s -- blob size: %s, type: %s', fnName, blob.size, typeof blob);
					try {
						var res = doh.st.Decode(blob, decformat); // "utf-8" seems to be standard, "auto" does not work for me
					} catch(e) { logger.serror('%s -- StringTools.Decode() error: %s, file: %s', fnName, e.description, path); }
					blob.Free();
				} catch(e) { logger.serror('%s -- FSUtil.Read() error: %s, file: %s', fnName, e.description, path); }
				fh.Close();
				return res || false;
			},
			/**
			 * saves given contents to file (incl. ADS streams)
			 * is compatible with extremely long paths, incl. > 255 chars
			 *
			 * DO NOT PASS QUOTES, SINGLE OR DOUBLE - they will be automatically added
			 *
			 * for format not all of "base64", "quoted", "auto"=not supplied, "utf-8", "utf-16", "utf-16-le", "utf-16-be" do work
			 * the only ones which worked reliably in my tests are utf-8 & utf-16, since they're the only ones Blob.CopyFrom() supports
			 * @example
			 * numBytesWritten = FS.SaveFile("Y:\\MyDir\\myfile.txt", 'Hello World');
			 * numBytesWritten = FS.SaveFile("Y:\\MyDir\\myfile.txt:CustomMetaInfo", encodeURI(new Date().getTime().toString()), FS.TEXT_ENCODING.utf16);
			 * numBytesWritten = FS.SaveFile("Y:\\MyDir\\myfile.txt:CustomMetaInfo", encodeURI("{\"a\": 1}"), FS.TEXT_ENCODING.utf8);
			 * @param {string} path file path to save
			 * @param {string} contents contents
			 * @param {number=} format use one of {TEXT_ENCODING.utf8} or {TEXT_ENCODING.utf16}
			 * @returns {number|false} number of bytes written on success, false on error
			 * @see TEXT_ENCODING
			 */
			saveFile: function (path, contents, format) {
				var fnName = 'FS.saveFile';

				// if (path.length > 240 && path.indexOf('\\\\?\\') === -1) {
				// 	path   = '\\\\?\\' + path;
				// }

				// unlike ST.Encode()/Decode(), Blob.CopyFrom() uses 'utf8', not 'utf-8'
				var copyformat = format === TEXT_ENCODING.utf16 ? '' : 'utf8';
				var decformat  = format === TEXT_ENCODING.utf16 ? 'utf-16' : 'utf-8';

				// wa: wa - create a new file, always. If the file already exists it will be overwritten. (This is the default.)
				var fh = doh.fsu.OpenFile(path, 'wa');
				if(fh.error !== 0) {
					logger.serror('%s -- FSUtil.OpenFile() error: %s, file: %s', fnName, fh.error, path);
					return false;
				}
				try {
					var blob = doh.dc.Blob; blob.CopyFrom(contents, copyformat); // seems to use implicitly utf-16, only available optional param is utf8
					var decoded = doh.st.Decode(blob, decformat);                // TODO - Do I need this at all?
					var numBytesWritten = fh.Write(blob);
					logger.sverbose('%s -- String to write to %s: %s', fnName, path, contents);
					logger.sverbose('%s -- blob -- type: %s, size: %d\n%s', fnName, typeof blob, blob.size, decoded);
					logger.sverbose('%s -- Written bytes: %d', fnName, numBytesWritten);
				} catch(e) { logger.serror('%s --  FSUtil.Write() error: %s, file: %s', fnName, e.description, path); }
				blob.Free();
				fh.Close();
				return numBytesWritten || false;
			},
			/**
			 * checks if given path is valid
			 * @param {string} path file path
			 * @returns {boolean} true if file exists
			 */
			isValidPath: function (path) {
				return doh.fsu.Exists(path);
			}
		}
	}());
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

	function __ADS_ACCESS__(){ 0 }
	var ADS = (function (){
		var myName = 'ADS';

		var msn = getHashStreamName();

		function validateStreamNameAndItem(callerName, oItem) {
			if (!msn) {
				abortWithFatalError(sprintf('%s() -- Cannot continue without a stream name: %s', callerName, msn));
			}
			if (!doh.isValidDOItem(oItem)) {
				abortWithFatalError(sprintf('%s() -- Expected DOpus Item, got type: %s, value: %s', callerName, dumpObject(oItem)));
			}
			return ''+oItem.realpath; // realpath returns a DOpus Path object and it does not work well with Map as an object, we need a simple string
		}
		/**
		 * returns the hash stream name
		 * WARNING: if you change this you will lose access to streams and they will become orphans
		 * @param {string=} algorithm one of DOpus builtin algorithms: sha1, sha256, sha512, md5, etc.
		 * @returns {string} the ADS stream name to use
		 */
		function getHashStreamName(algorithm) {
			if (typeof algorithm === 'undefined') algorithm = CURRENT_ALGORITHM;
			return (STREAM_PREFIX + algorithm.toUpperCase());
		}
		/**
		 * @param {DOpusItem} oItem
		 * @returns {{readonly: boolean, system: boolean}}
		 */
		function getFileAttributes(oItem) {
			var fnName = 'ADS.checkFileAttributes';
			// check the file attributes: Read-Only & System
			var resetAttribReadOnly = false,
				resetAttribSystem   = false,
				oFile               = oItem.Open('m');
			if (oItem.fileattr.readonly) {
				if (IGNORE_READONLY_FLAG) {
					oFile.SetAttr('-r');
					resetAttribReadOnly = true;
				} else {
					// TODO show warning message or skip
					logger.sforce('%s -- unignored READONLY file found: %s', fnName, oItem.name);
					playFeedbackSound('Warn');
				}
			}
			if (oItem.fileattr.system) {
				if (IGNORE_SYSTEM_FLAG) {
					oFile.SetAttr('-s');
					resetAttribSystem = true;
				} else {
					// TODO show warning message or skip
					logger.sforce('%s -- unignored SYSTEM file found: %s', fnName, oItem.name);
					playFeedbackSound('Warn');
				}
			}
			return {readonly: resetAttribReadOnly, system: resetAttribSystem};
		}
		/**
		 * @param {DOpusItem} oItem
		 * @param {{readonly: boolean, system: boolean}} oFileAttrib
		 */
		function resetFileAttributes(oItem, oFileAttrib) {
			var oFile = oItem.Open('m');
			oFileAttrib.readonly && oFile.SetAttr('+r');
			oFileAttrib.system   && oFile.SetAttr('+s');
		}

		return {
			name: myName,
			/**
			 * checks if given item has a hash stream
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {boolean} true if file has a hash stream
			 * @see getHashStreamName()
			 */
			hasHashStream: function (oItem) {
				var fnName = 'ADS.hasHashStream';
				validateStreamNameAndItem(fnName, oItem);
				if (!doh.isFile(oItem)) return false;
				return FS.isValidPath(oItem.realpath + ':' + msn);
			},
			/**
			 * returns the stored ADS data as POJO
			 * uses cache if enabled and possible
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {CachedItem|false} CachedItem on success, false on error
			 * @see FS.readFile()
			 */
			read: function (oItem) {
				var fnName = 'ADS.read';

				// initCacheIfNecessary();
				var rp    = validateStreamNameAndItem(fnName, oItem),
					cache = cacheMgr.getCacheAutoInit(),
					res;

				// check if cache is enabled and item is in cache
				if (CACHE_ENABLED && cache.exists(rp)) {
					logger.sverbose('%s found in cache', oItem.name);
					res = cache(rp);
				} else {
					logger.sverbose('%s -- reading from disk: %s', fnName, oItem.name);
					res = FS.readFile(rp + ':' + msn, FS.TEXT_ENCODING.utf8); // always string or false ion error
					if (!res || typeof res !== 'string') return false;
					if (CACHE_ENABLED && !cache.exists(rp)) {
						logger.sverbose('%s -- adding missing %s to cache', fnName, oItem.name);
						res = cacheMgr.enrichWithCacheFields(res);
						cacheMgr.setCacheVar(rp, res);
					}
				}
				// convert to custom object
				var _tmp = JSON.parse(res);
				return new CachedItem(oItem, _tmp.last_modify, _tmp.last_size, _tmp.hash, _tmp.algorithm);
			},
			/**
			 * saves given POJO as ADS data, calls SaveFile()
			 * populates/updates cache if enabled
			 * @param {DOpusItem} oItem DOpus Item object
			 * @param {CachedItem} oCachedItem
			 * @returns {number|false} number of bytes written on success, false on error
			 * @see FS.saveFile()
			 */
			save: function (oItem, oCachedItem) {
				var fnName = 'ADS.save';

				var filePath    = validateStreamNameAndItem(fnName, oItem),
					targetPath  = filePath + ':' + msn,
					origModDate = DateToDOpusFormat(oItem.modify);
				logger.sinfo('%s -- Saving %s to %s, with original modification date: %s', fnName, JSON.stringify(oCachedItem), targetPath, origModDate);

				// check if cache is enabled, add/update unconditionally
				if (CACHE_ENABLED) {
					cacheMgr.setCacheVar(filePath, cacheMgr.enrichWithCacheFields(oCachedItem));
					logger.sverbose('%s - Cache count: %d', fnName, cacheMgr.getCount());
				}

				// check the file attributes: Read-Only & System
				var oFileAttrib = getFileAttributes(oItem);

				if (filePath.length > 240 ) {
					filePath   = '\\\\?\\' + filePath;
					targetPath = '\\\\?\\' + targetPath;
				}

				var numBytesWritten = FS.saveFile(targetPath, JSON.stringify(oCachedItem), FS.TEXT_ENCODING.utf8);
				if (!numBytesWritten) abortWithFatalError('Cannot save to ' + targetPath + ', # bytes written: ' + numBytesWritten);

				logger.sverbose('SetAttr FILE="' + filePath + '" META "lastmodifieddate:' + origModDate + '"');
				doh.cmd.RunCommand('SetAttr FILE="' + filePath + '" META "lastmodifieddate:' + origModDate + '"');

				// reset the file attributes if necessary: Read-Only & System
				resetFileAttributes(oItem, oFileAttrib);

				return numBytesWritten;
			},
			/**
			 * deletes ADS data, directly deletes "file:stream"
			 * removes item from cache if enabled
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns nothing
			 */
			remove: function (oItem) {
				var fnName = 'ADS.delete';

				var filePath    = validateStreamNameAndItem(fnName, oItem),
					targetPath  = filePath + ':' + msn,
					origModDate = DateToDOpusFormat(oItem.modify);
				logger.sinfo('%s -- Deleting %s and resetting modification date to: %s', fnName, oItem.realpath, origModDate);

				if (CACHE_ENABLED) {
					cacheMgr.deleteCacheVar(filePath);
				}

				if (filePath.length > 240 ) {
					filePath   = '\\\\?\\' + filePath;
					targetPath = '\\\\?\\' + targetPath;
				}
				logger.sverbose('SetAttr FILE="' + filePath + '" META "lastmodifieddate:' + origModDate + '"');
				doh.cmd.RunCommand('Delete /quiet /norecycle "' + targetPath + '"');
				doh.cmd.RunCommand('SetAttr FILE="' + filePath + '" META "lastmodifieddate:' + origModDate + '"');


			}
		}
	}());
}



/*
	 .d8888b.         d8888  .d8888b.  888    888 8888888888      .d8888b.         88888888888 888    888 8888888b.  8888888888        d8888 8888888b.      888b     d888  .d8888b.  8888888b.
	d88P  Y88b       d88888 d88P  Y88b 888    888 888            d88P  "88b            888     888    888 888   Y88b 888              d88888 888  "Y88b     8888b   d8888 d88P  Y88b 888   Y88b
	888    888      d88P888 888    888 888    888 888            Y88b. d88P            888     888    888 888    888 888             d88P888 888    888     88888b.d88888 888    888 888    888
	888            d88P 888 888        8888888888 8888888         "Y8888P"             888     8888888888 888   d88P 8888888        d88P 888 888    888     888Y88888P888 888        888   d88P
	888           d88P  888 888        888    888 888            .d88P88K.d88P         888     888    888 8888888P"  888           d88P  888 888    888     888 Y888P 888 888  88888 8888888P"
	888    888   d88P   888 888    888 888    888 888            888"  Y888P"          888     888    888 888 T88b   888          d88P   888 888    888     888  Y8P  888 888    888 888 T88b
	Y88b  d88P  d8888888888 Y88b  d88P 888    888 888            Y88b .d8888b          888     888    888 888  T88b  888         d8888888888 888  .d88P     888   "   888 Y88b  d88P 888  T88b
	 "Y8888P"  d88P     888  "Y8888P"  888    888 8888888888      "Y8888P" Y88b        888     888    888 888   T88b 8888888888 d88P     888 8888888P"      888       888  "Y8888P88 888   T88b
*/
{
	var cacheMgr = (function(){
		var myName = 'cacheMgr';

		return {
			/**
			 * initializes cache if necessary and returns it
			 * @returns {object|false} cache object on success, false on error or if cache is disabled
			 */
			getCacheAutoInit: function() {
				var fnName = 'ADS.initCacheIfNecessary';
				if (!CACHE_ENABLED) {
					logger.sverbose('%s -- Cache not enabled: %b', fnName, CACHE_ENABLED);
					return false;
				}
				var cache = this.getCache();
				if (cache) {
					logger.sverbose('%s -- Cache already initialized - Current count: %d', fnName, cache.count);
					return cache;
				} else {
					this.clearCache();
					if (this.getCache().count !== 0) {
						abortWithFatalError('This should have not happened');
					}
					return this.getCache();
				}
			},
			/**
			 * clears cache
			 */
			clearCache: function() {
				var fnName = 'cache.clearCache()';
				doh.sv.Set('cache', doh.dc.Map());
				logger.sforce('%s -- Cache cleared', fnName);
			},
			/**
			 * @returns {number} number of items in the cache
			 */
			getCount: function() {
				return doh.sv.Get('cache').count;
			},
			/**
			 * returns cache map
			 * @returns {object|false} cache object on success, false on error
			 */
			getCache: function() {
				return doh.sv.Exists('cache') ? doh.sv.Get('cache') : false;
			},
			/**
			 * sets the value for the given map key
			 * @param {any} key
			 * @param {any} val
			 */
			getCacheVar: function(key) {
				// @ts-ignore
				return doh.sv.Get('cache')(key);
			},
			/**
			 * sets the value for the given map key
			 * @param {any} key
			 * @param {any} val
			 */
			setCacheVar: function(key, val) {
				// @ts-ignore
				doh.sv.Get('cache')(key) = val;
			},
			/**
			 * deletes the key and its value
			 * @param {any} key
			 */
			deleteCacheVar: function(key) {
				// doh.sv.Get('cache') && doh.sv.Get('cache').exists(key) && doh.sv.Get('cache').erase(key);
				doh.sv.Get('cache') && doh.sv.Get('cache').erase(key);
			},
			/**
			 * returns the special thread pool map
			 * @returns {object|false}
			 */
			getThreadPoolAutoInit: function() {
				doh.sv.Set('TP', doh.dc.Map());
				return doh.sv.Get('TP');
			},
			/**
			 * returns a value from the special thread pool map
			 * @param {any} threadID
			 * @returns {object|false} object in thread pool on success, false on error
			 */
			getThreadPoolVar: function(threadID) {
				// return doh.sv.Exists('TP') && doh.sv.Exists('TP')(threadID) ? doh.sv.Get('TP')(threadID) : false;
				return doh.sv.Exists('TP') ? doh.sv.Get('TP')(threadID) : false;
			},
			/**
			 * sets the value in the special thread pool map
			 * @param {any} threadID
			 * @param {any} val
			 */
			setThreadPoolVar: function(threadID, val) {
				// @ts-ignore
				doh.sv.Get('TP')(threadID) = val;
			},
			/**
			 * adds cache-only fields which are not in and will not be stored in streams
			 * @param {object|string} oPOJO object to enrich with cache-only fields
			 * @returns {string} enriched POJO with the fields added_to_cacheXXX as JSOnified string
			 */
			enrichWithCacheFields: function(oPOJO) {
				// add cache only parameters for tooltips, etc.
				var res = oPOJO;
				if (typeof oPOJO === 'string') {
					res = JSON.parse(res);
				}
				res.added_to_cache          = new Date().getTime();
				res.added_to_cache_friendly = res.added_to_cache.formatAsDateTimeCompact();
				return JSON.stringify(res);
			},
			/**
			 * removes cache-only fields
			 * @param {object} oPOJO
			 */
			removeCacheFields: function(oPOJO) {
				delete oPOJO.added_to_cache;
				delete oPOJO.added_to_cache_friendly;
			}
		}
	}());
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
	 * @param {DOpusItem} oItem DOpus Item object
	 * @param {string=} algo Hashing algorithm to use
	 * @returns {Result} result object
	 * @see CURRENT_ALGORITHM
	 */
	function calculateHashProxy(oItem, algo) {
		algo = algo || CURRENT_ALGORITHM;
		switch(algo.toUpperCase()) {
			case 'BLAKE3':
				return calculateFileHashWithExtBlake(oItem);
			case 'SHA1':
			case 'MD5':
			case 'CRC32':
			case 'CRC32_PHP':
			case 'CRC32_PHP_REV':
				return calculateFileHashWithDOpus(oItem, algo);
			case 'SHA256':
			case 'SHA512':
				abortWithFatalError('DO NOT USE!\n\nCurrent DOpus version as of 20210120 has a bug\nwith hashing files >=512 MB using SHA256 or SHA512.\nSee: https://resource.dopus.com/t/column-sha-256-and-sha-512/33525/6');
			default:
				abortWithFatalError('Given algorithm is not (yet) implemented, but you can easily use an external app if you want.');
		}
	}
	/**
	 * internal method to calculate hash with given algorithm
	 * @param {DOpusItem} oItem DOpus Item
	 * @param {string} algo algorithm to use
	 * @returns {Result} result object
	 * @see CURRENT_ALGORITHM
	 */
	function calculateFileHashWithDOpus(oItem, algo) {
		var fnName = 'calculateFileHashWithDOpus'
		if (!doh.isValidDOItem(oItem)) { logger.serror('%s -- No file name received: ', fnName, oItem); return; }

		logger.sverbose('\t\t%s -- Calculating %s hash, started @%s, file: %s', fnName, algo, now(), oItem);
		try {
			var outObj = new Result(doh.fsu.Hash(oItem, algo), false, false);
			logger.sinfo('\t\t%s -- Calculating %s hash, finished @%s, file: %s, result: %s', fnName, algo, now(), oItem, outObj['result']);
		} catch (e) {
			var outObj = new Result(false, e.toString(), false);
			logger.sforce('\t\t%s -- Error: %s, File: %s', fnName, e.toString(), oItem);
		}
		return outObj;
	}

	/**
	 * internal method to calculate hash with given algorithm
	 * @param {DOpusItem} oItem DOpus Item
	 * @returns {Result} result object
	 * @see CURRENT_ALGORITHM
	 */
	function calculateFileHashWithExtBlake(oItem) {
		var fnName = funcNameExtractor(calculateFileHashWithExtBlake);

		var tempOutFile = util.shell.ExpandEnvironmentStrings(TEMPDIR) + '\\' + Global.SCRIPT_NAME + '-' + oItem.name + '-' + now() + '.tmp.txt';
		// var cmd = 'PowerShell.exe "Get-Partition –DriveLetter ' + driveLetter.slice(0,1) + ' | Get-Disk | Get-PhysicalDisk | Select MediaType | Select-String \'(HDD|SSD)\'" > "' + tempPSOutFile + '"';
		var cmd = 'cmd.exe /c Y:\\b3sum.exe --no-names "' + oItem.realpath + '" > "' + tempOutFile + '"';
		logger.sverbose('%s -- Running: %s', fnName, cmd);
		// util.shell.Run(cmd, 0, true); // 0: hidden, true: wait
		util.shell.Run(cmd, 0, true); // 0: hidden, true: wait
		var sContents = FS.readFile(tempOutFile, FS.TEXT_ENCODING.utf8);
		doh.cmd.RunCommand('Delete /quiet /norecycle "' + tempOutFile + '"');
		if (!sContents) {
			logger.error('Could not get the hash results from temp file: ' + tempOutFile);
			return new Result(false, 'Could not get the hash results from temp file: ' + tempOutFile);
		} else {
			logger.sforce('%s -- sContents: %s', fnName, sContents);
			// sContents = sContents.trim().replace(/^(\S+)\s.+$/, '$1');
			sContents = sContents.trim();
			return new Result(sContents);
		}
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

	function __FILTERS__(){ 0 }
	// valid filters for workers
	var filters = (function (){
		var myName = 'filters';
		var PUBLIC = {

			fnFilterAcceptAnyFile: function (oItem) {
				return true;
			},
			fnFilterRejectAnyFile: function (oItem) {
				return false;
			},
			fnFilterAcceptDirtyOnly: function (oItem, oADSData) {
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
					differentSize      = parseInt(oItem.size, 10)         !== oADSData.last_size;
				res = differentModifDate || differentSize;
				return res;
			},
			fnFilterAcceptWithValidHashesOnly: function (oItem, oADSData) {
				return PUBLIC.fnFilterAcceptWithHashes(oItem) && !(PUBLIC.fnFilterAcceptDirtyOnly(oItem, oADSData)); // note how we must reverse the value
			},
			fnFilterAcceptWithHashes: function (oItem) {
				return ADS.hasHashStream(oItem);
			},
			fnFilterRejectWithHashes: function (oItem) {
				return !(PUBLIC.fnFilterAcceptWithHashes(oItem)); // note how we must reverse the value
			},
			fnFilterAcceptMissingOrDirty: function (oItem) {
				// put missing first, because it will be often faster to check if a stream exists than opening and parsing it
				return PUBLIC.fnFilterRejectWithHashes(oItem) || PUBLIC.fnFilterAcceptDirtyOnly(oItem);
			}
		};
		return {
			name: myName,
			PUBLIC: PUBLIC,
			// another ugly solution
			getName: function (fnFunction) {
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

	function __ACTIONS__(){ 0 }
	// valid actions for workers
	var actions = (function (){
		var myName = 'actions';
		var PUBLIC = {
			/**
			 * @returns {Result}
			 */
			fnActionNull: function () {
				// nothing
				return new Result(true);
			},
			/**
			 * @returns {Result}
			 */
			fn_NOT_IMPLEMENTED_YET: function () {
				showMessageDialog(null, 'Not implemented yet', 'Placeholder');
				return new Result(false, true, false);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {Result}
			 */
			fnActionCalculateOnly: function (oItem) {
				var fnName = 'actions.fnActionCalculateOnly';
				logger.sverbose('%s -- I got called with: %s', fnName, dumpObject(oItem));
				return calculateHashProxy(oItem);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {Result}
			 */
			fnActionBenchmark: function (oItem) {
				var fnName = 'actions.fnActionBenchmark';
				logger.sverbose('%s -- I got called with: %s', fnName, dumpObject(oItem));
				return calculateHashProxy(oItem);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {Result}
			 */
			fnActionCalculateAndCompareToADS: function (oItem) {
				var fnName = 'actions.fnActionCalculateAndCompareToADS';
				logger.sverbose('%s -- I got called with: %s', fnName, dumpObject(oItem));

				var oldData = ADS.read(oItem);
				if (!oldData) {
					// TODO - Replicate this scenario and replace the message below
					logger.serror('Cannot read data for: ' + oItem.realpath);
					return;
				}
				var newHashResult = calculateHashProxy(oItem);
				logger.sverbose('%s -- old: %s, new: %s', fnName, oldData.hash, newHashResult.ok);
				if (newHashResult.isOK() && newHashResult.ok === oldData.hash) {
					return new Result('Stored hash is valid', false, false);
				} else {
					return new Result(false, sprintf('Hashes differ! Stored: %s, New: %s', oldData.hash, newHashResult.ok), false);
				}
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {Result}
			 */
			fnActionCalculateAndSaveToADS: function (oItem) {
				var fnName = 'actions.fnActionCalculateAndSaveToADS';
				logger.sverbose('%s -- I got called with: %s', fnName, dumpObject(oItem));

				var newHashResult = calculateHashProxy(oItem);
				if (newHashResult.isOK()) {
					ADS.save(oItem, new CachedItem(oItem, null, null, newHashResult.ok));
				}
				return newHashResult;
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {Result}
			 */
			fnActionDeleteADS: function (oItem) {
				var fnName = 'actions.fnActionDeleteADS';
				logger.sverbose('%s -- I got called with: %s', fnName, dumpObject(oItem));
				ADS.remove(oItem);
				return new Result(true);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @param {string} hash used e.g. for verifying using external files, then it will be filled by the knapsack (as HashedItem) then by the manager (as a DOpus Map) already
			 * @param {string=} algorithm used e.g. for verifying using external files, then it will be filled by the knapsack (as HashedItem) then by the manager (as a DOpus Map) already
			 * @returns {Result}
			 */
			fnCompareAgainstHash: function (oItem, hash, algorithm) {
				// TODO - review!
				var fnName = 'actions.fnCompareAgainstHash';
				algorithm = algorithm || CURRENT_ALGORITHM;
				if (typeof hash === 'undefined' || !hash) {
					logger.sforce('%s -- Got no hash value to compare to', fnName);
					return new Result(false, 'Got no hash value to compare to');
				}
				logger.sverbose('%s -- Filename: %s - Comparing against external algorithm: %s, hash: %s', fnName, oItem.name, algorithm, hash);
				var myResult = calculateHashProxy(oItem, algorithm);
				if (!myResult.isOK()) {
					return myResult;
				}
				logger.sinfo('%s -- My own hash: %s  --  External hash: %s', fnName, myResult.ok, hash);
				if (myResult.ok === hash) {
					var result = new Result('Hash values are identical: ' + hash, false, false);
				} else {
					var result = new Result(false, 'Hash values differ -- mine: ' + myResult.ok + ', external: ' + hash);
				}
				return result;
			}
		};
		return {
			name: myName,
			PUBLIC: PUBLIC,
			validate: function (name) {
				var fnName = 'actions.validate';
				if (!PUBLIC.hasOwnProperty(name)) {
					// abortWithFatalError(sprintf('%s -- No or invalid action -- type: %s - %s', fnName, typeof name, name));
					abortWithFatalError(sprintf('%s -- Unrecognized action:\n%s', fnName, dumpObject(name)));
				}
			},
			// another ugly solution
			getName: function (fnFunction) {
				var fnName = 'actions.getName';
				for (var fn in this.PUBLIC) {
					if (!this.PUBLIC.hasOwnProperty(fn)) continue;
					if (fnFunction == this.PUBLIC[fn]) return fn;
				}
				abortWithFatalError(sprintf('%s -- Unrecognized action:\n%s', fnName, dumpObject(fnFunction)));
			},
			getFunc: function (name) {
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

	function __STOPWATCH__(){ 0 }
	var stopwatch = (function (){
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
			start: function (id) {
				ensureNotExists(id, 'start');
				var _now = now();
				_running[id] = { startTS: _now, finishTS: 0 }
				return _now;
			},
			/**
			 * resets the stopwatch
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			reset: function (id) {
				ensureExists(id, 'reset');
				var _now = now();
				var _elapsed = _now - _running[id]['startTS'];
				_running[id]['startTS'] = _now;
				return _elapsed;
			},
			/**
			 * returns elapsed time
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			getElapsed: function (id) {
				ensureExists(id, 'getElapsed');
				var _elapsed =  now() - _running[id]['startTS'];
				return _elapsed;
			},
			/**
			 * stops the stopwatch and returns elapsed time
			 * @param {string} id any unique name
			 * @returns {number} elapsed time in millisecs
			 */
			stop: function (id) {
				ensureExists(id, 'stop');
				var _elapsed = now() - _running[id]['startTS']
				delete _running[id];
				return _elapsed;
			},
			/**
			 * starts a stopwatch and returns a formatted string
			 * @param {string} id any unique name
			 * @param {string=} prefix string prefix in output
			 * @param {string=} suffix string suffix in output
			 * @returns {number} current time in millisecs
			 * @see start
			 */
			startAndPrint: function (id, prefix, suffix) {
				this.start(id);
				return sprintf('%s -- %s Started @%d %s', id, (prefix ? prefix + ' -' : ''), _running[id]['startTS'], (suffix ? '- ' + suffix : ''));
			},
			/**
			 * resets the stopwatch and returns a formatted string
			 * @param {string} id any unique name
			 * @param {string=} prefix string prefix in output
			 * @param {string=} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see reset
			 */
			resetAndPrint: function (id, prefix, suffix) {
				var _elapsed = this.reset(id);

				return sprintf('%s -- %s Reset @%d, Elapsed so far: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), _running[id]['startTS'], _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
			},
			/**
			 * returns elapsed time as a formatted string
			 * @param {string} id any unique name
			 * @param {string=} prefix string prefix in output
			 * @param {string=} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see getElapsed
			 */
			getElapsedAndPrint: function (id, prefix, suffix) {
				var _elapsed =  this.getElapsed(id);

				return sprintf('%s -- %s Elapsed so far: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
			},
			/**
			 * stops a stopwatch and returns elapsed time as a formatted string
			 * @param {string} id any unique name
			 * @param {string=} prefix string prefix in output
			 * @param {string=} suffix string suffix in output
			 * @returns {number} elapsed time in millisecs
			 * @see stop
			 */
			stopAndPrint: function (id, prefix, suffix) {
				var _elapsed = this.stop(id);
				return sprintf('%s -- %s Finished @%d, Duration: %d ms (%s s) %s', id, (prefix ? prefix + ' -' : ''), now(), _elapsed, _elapsed.formatAsDuration(), (suffix ? '- ' + suffix : ''));
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

	function __PROGRESS_BAR__(){ 0 }
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
	function updateProgressBar(progbar, tsStart, filename, finished_bytes_so_far, selected_bytes_cnt, formattedMax, unitMax) {
		var userAborted = false;

		// UPDATE THE PROGRESS BAR
		if (!USE_PROGRESS_BAR) return userAborted;

		switch (progbar.GetAbortState()) {
			case 'a':
				setAbortStatus(true);
				userAborted = true;
				break;
			case 'p':
				while (progbar.GetAbortState() !== '') {
					setPauseStatus(true);
					// if (sleepdur) doh.delay(sleepdur);
					doh.delay(500);
					if (progbar.GetAbortState() === 'a') {
						setAbortStatus(true);
						userAborted = true;
						break;
					}
				}
				setPauseStatus(false);
				break;
		}
		// return userAborted;
		// logger.forceSprintf('%s -- totalbytes: %d, selected_bytes_cnt: %d', fnName, totalbytes, selected_bytes_cnt);
		var elapsed          = (now() - tsStart)/1000;
		var percentage       = Math.floor(100 * finished_bytes_so_far / selected_bytes_cnt||1);
		var formattedCurrent = finished_bytes_so_far.formatAsSize(unitMax);

		if (now() % 10 === 0) {
			// refresh these slower
			var bytesPerSec      = Math.round( finished_bytes_so_far / elapsed||1 );
			var timeRemaining    = elapsed < 3 ? '....' : Math.round( elapsed * ( (selected_bytes_cnt/finished_bytes_so_far) - 1) ) + 's';

			progbar.SetStatus(sprintf('Est. Time Remaining: %4s, Average Speed: %7s/s', timeRemaining, bytesPerSec.formatAsSize()));
		}
		progbar.SetName(filename);
		progbar.SetType('file');
		progbar.SetBytesProgress(percentage);
		progbar.SetTitle(sprintf('%2d% - %s/%s', percentage, formattedCurrent, formattedMax));
		return userAborted;
	}
	function finalizeProgressBar(progbar) {
		if (!USE_PROGRESS_BAR) return;
		// progbar.SetBytesProgress(100);
		progbar.FinishFile();
		// doh.delay(10);
		// progbar.SkipFile();
		// doh.delay(10);
		progbar.Hide();
	}
	function getPausedOrAborted() {
		return (
			(doh.sv.Exists('paused') && doh.sv.Get('paused'))
			||
			(doh.sv.Exists('aborted') && doh.sv.Get('aborted'))
		);
	}
	function setPauseStatus(status) {
		// true: paused, false: unpaused/unknown
// TODO REMOVE
// logger.sforce('%s -- Setting pause status to: %s', 'setPauseStatus()', status);
		doh.sv.Set('paused', !!status);
	}
	function getPauseStatus() {
		return doh.sv.Exists('paused') ? doh.sv.Get('paused') : false;
	}
	function setAbortStatus(status) {
// TODO REMOVE
// logger.sforce('%s -- Setting abort status to: %s, (real: %s)', 'setAbortStatus()', status, !!status);
		doh.sv.Set('aborted', !!status);
	}
	function getAbortStatus() {
// TODO REMOVE
// var exists = doh.sv.Exists('aborted');
// var val = doh.sv.Get('aborted');
// logger.sforce('%s -- exists: %b, val: %s', 'getAbortStatus()', exists, val);
		return doh.sv.Exists('aborted') ? doh.sv.Get('aborted') : false;
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

	function __FEEDBACK__(){ 0 }
	function showMessageDialog(dialog, msg, title, buttons) {
		var dlgConfirm      = dialog || doh.dlg();
		dlgConfirm.message  = msg;
		dlgConfirm.title    = Global.SCRIPT_NAME + '-' + (title || '');
		dlgConfirm.buttons  = buttons || 'OK';
		var ret = dlgConfirm.show;
		return ret;
	}
	/**
	 * @param {string} soundFile
	 */
	function playFeedbackSound(soundFile) {
		var fnName = funcNameExtractor(playFeedbackSound);

		var myProps   = _getScriptPathVars(),
			soundsDir = myProps.path + Global.SCRIPT_NAME + 'Sounds\\',
			cmd       = '';

		// if the sounds directory does not exist
		// extract the OSP and delete everything else in the extracted dir except *.wav (usually .js, .ts & Icons Directory)
		if (!FS.isValidPath(soundsDir) && myProps.isOSP && myProps.fullpath) {
			logger.sforce('%s -- Cannot find Sounds Directory', fnName, soundsDir);
			cmd = sprintf('Copy FILE "%s" EXTRACT TO "%s"', myProps.fullpath, soundsDir); logger.normal(cmd); doh.cmd.AddLine(cmd);
			cmd = sprintf('Delete QUIET "%s~(*.wav)"', soundsDir);                        logger.normal(cmd); doh.cmd.AddLine(cmd);
			doh.cmd.Run();
		}
		soundFile = soundsDir + Global.SCRIPT_NAME + '_' + soundFile + '.wav';
		logger.sverbose('%s -- soundFilePath: %s', 'playFeedbackSound', soundFile);
		doh.cmd.RunCommand('Play QUIET "' + soundFile + '"');
	}
	function abortWithFatalError(msg) {
		var err = 'Fatal error occurred:\n\n' + msg;
		doh.out('');
		doh.out('');
		doh.out('');
		doh.out('');
		doh.out(err);
		showMessageDialog(false, err);
		throw new Error(err);
	}
	var busyIndicator = (function (){
		var myName = 'busyIndicator';
		var _busyind = null;
		return {
			name: myName,
			start: function (sourceTab, message) {
				if (_busyind) this.stop();
				_busyind = doh.dc.BusyIndicator();
				_busyind.Init(sourceTab);
				_busyind.Update(message);
				_busyind.Show();
			},
			stop: function () {
				if (!_busyind) return;
				_busyind.Destroy();
				_busyind = false;
			}
		}
	}());
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

	function __FORMATTERS__(){ 0 }
	// turns 2^10 to "KB", 2^20 to "MB" and so on
	/**
	 * @returns {[string, number]}
	 */
	Number.prototype.getUnit = (function () {
		// TODO refactor this!
		/** @enum {Array} */
		var units = {
			B : [ 'B', 0],
			KB: [ 'KB', Math.pow(2, 10)],
			MB: [ 'MB', Math.pow(2, 20)],
			GB: [ 'GB', Math.pow(2, 30)],
			TB: [ 'TB', Math.pow(2, 40)],
			PB: [ 'PB', Math.pow(2, 50)] // if somebody manages to see this, I will buy you a beer!
		};
		return function () {
			if      (Math.abs(this) >= units.PB[1]) return units.PB;
			else if (Math.abs(this) >= units.TB[1]) return units.TB;
			else if (Math.abs(this) >= units.GB[1]) return units.GB;
			else if (Math.abs(this) >= units.MB[1]) return units.MB;
			else if (Math.abs(this) >= units.KB[1]) return units.KB;
			else                          return units.B;
		}
	}());
	// turns 2^10 to "1.0 KB", 2^20 to "1.0 MB" and so on
	/**
	 * @param {[string, number]} unit
	 * @param {number} decimal
	 */
	Number.prototype.formatAsSize = function (unit, decimal) {
		if (this.valueOf() === 0) {
			return '0 bytes';
		}
		if (typeof unit === 'undefined' || !unit.length) {
			unit = this.getUnit();
		}
		if (typeof decimal !== 'number') {
			decimal = 2;
		}
		if (unit[1] === 0) {
			return this.valueOf() + ' ' + unit[0];
		} else {
			return (this.valueOf() / unit[1]).toFixed(decimal) + ' ' + unit[0];
		}
	};
	// turns milliseconds to rounded seconds
	Number.prototype.formatAsDuration = function () {
		return (this.valueOf()/1000).toFixed(1);
	};
	// converts timestamps to time format
	Number.prototype.formatAsHms = function () {
		// "18:24:16"
		return new Date(this.valueOf()).toTimeString().substr(0,8);
	}
	// turns timestamp to ISO "2021-01-19T18:24:16.123Z" format
	Number.prototype.formatAsDateISO = function () {
		// "2021-01-19T18:24:16.123Z"
		var oDate    = new Date(this.valueOf());
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
	Number.prototype.formatAsDateTimeCompact = function () {
		// "20210119-182416"
		var oDate    = new Date(this.valueOf());
		var vYear    = oDate.getFullYear();
		var vMonth   = (1 + oDate.getMonth()).toString(); if (vMonth.length == 1) { vMonth = '0' + vMonth; }
		var vDay     = oDate.getDate().toString();        if (vDay.length == 1) { vDay = '0' + vDay; }
		var vHours   = oDate.getHours().toString();       if (vHours.length == 1) { vHours = '0' + vHours; }
		var vMinutes = oDate.getMinutes().toString();     if (vMinutes.length == 1) { vMinutes = '0' + vMinutes; }
		var vSeconds = oDate.getSeconds().toString();     if (vSeconds.length == 1) { vSeconds = '0' + vSeconds; }
		return '' + vYear + vMonth + vDay + '-' + vHours + vMinutes + vSeconds;
		// JScript does not have toISOString() :/
		// return (new Date(this).toISOString()).replace(/[:-]/g, '').replace(/\..+$/, '').replace('T', '-');
	}
	// turns timestamp to DOpus "D2021-01-19 T18:24:16" format
	Number.prototype.formatAsDateDOpus = function () {
		// "20210119-182416"
		var oDate    = new Date(this.valueOf());
		var vYear    = oDate.getFullYear();
		var vMonth   = (1 + oDate.getMonth()).toString(); if (vMonth.length == 1) { vMonth = '0' + vMonth; }
		var vDay     = oDate.getDate().toString();        if (vDay.length == 1) { vDay = '0' + vDay; }
		var vHours   = oDate.getHours().toString();       if (vHours.length == 1) { vHours = '0' + vHours; }
		var vMinutes = oDate.getMinutes().toString();     if (vMinutes.length == 1) { vMinutes = '0' + vMinutes; }
		var vSeconds = oDate.getSeconds().toString();     if (vSeconds.length == 1) { vSeconds = '0' + vSeconds; }
		return 'D' + vYear + '-' + vMonth + '-' + vDay + ' T' + vHours + ':' + vMinutes + ':' + vSeconds;
	}
	// makes sure that the paths always have a trailing backslash but no doubles
	// this happens mainly because the oItem.path does not return a trailing slash for any directory
	// other than root dir of a drive, i.e. it returns Y:\Subdir (no BS) but Y:\ (with BS)
	String.prototype.normalizeTrailingBackslashes = function () {
		return (this + '\\').replace(/\\\\/g, '\\').replace(/^\\$/, '');
	}
	// Date formatter for "SetAttr META lastmodifieddate..."
	// D2021-01-19 T18:24:16
	function DateToDOpusFormat(oItemDate) {
		return doh.dc.Date(oItemDate).Format("D#yyyy-MM-dd T#HH:mm:ss");
	}
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

	function __UTIL__(){ 0 }
	function now() {
		return new Date().getTime();
	}
	function getNewThreadID() {
		var _now = now();
		var blob = doh.dc.Blob;
		blob.CopyFrom('' + _now + Math.floor(1000000 + Math.random() * 8999999));
		var _nowMD5 = doh.fsu.Hash(blob, 'md5');
		return 't_' + _now + '_' + _nowMD5;
		// without some computation, the line below is not reliable enough
		// I occasionally get duplicate IDs: same TS & same random number for different threads!  O.O
		// doh.delay(1); // delay(1) seems to wait longer than 1 ms
		return 't_' + now() + '_' + Math.floor(1000 + Math.random() * 8999);
	}
	function getResVar(tid) {
		return 'v_' + tid;
	}
	// internal method
	// from https://attacomsian.com/blog/javascript-check-variable-is-object
	function isArray(arr) {
		return Object.prototype.toString.call(arr) === '[object Array]';
	}
	function isObject(obj) {
		return Object.prototype.toString.call(obj) === '[object Object]';
	};

	// Object.prototype.keys = function () {
	// 	// WARNING: be careful after activating this!
	// 	// for (var k in myObject) for ANY object will include this function by default
	// 	// if this function needs to be skipped, use if (!myObject.hasOwnProperty(k)) continue;
	// 	var out = [];
	// 	for (var k in this) {
	// 		if (this.hasOwnProperty(k)) out.push(k);
	// 	}
	// 	return out;
	// };
	function getObjKeys(obj) {
		var out = [];
		for (var k in obj) {
			if (obj.hasOwnProperty(k)) out.push(k);
		}
		return out;
	}
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, ''); // not even trim() JScript??
	}


	function createTempFileWithSize(size, count, outDir) {
		var instr = '';

		while (instr.length < size) {
			instr += Math.floor(10000000 + Math.random() * 89999999);
		}
		instr = instr.slice(0, size);

		var blob = doh.dc.Blob;
		blob.CopyFrom(instr);
		logger.sforce('instr: %s', instr);
		if (size !== instr.length) {
			abortWithFatalError('Could not generate requested test sample size');
		}
		var aFilenames = [];
		for (var i = 0; i < count; i++) {
			var filename = outDir + '\\' + Global.SCRIPT_NAME + '-benchmark-' + sprintf('%03d', i+1) + '.tmp.txt';
			var numBytesWritten = FS.saveFile(filename, instr);
			if (numBytesWritten !== size) {
				abortWithFatalError('Number of bytes written does not match given input size for ' + filename);
			}
			aFilenames.push(filename);
		}
		return aFilenames;
	}

	// hashPerformanceTest(Math.pow(2, 20), 5000); return;
	function hashPerformanceTest(size, count, maxcount) {
		var algorithms = [ 'md5', 'sha1', 'sha256', 'sha512', 'crc32', 'crc32_php', 'crc32_php_rev' ];

		var instr = '';
		// for (var i = 0; i < size; i++) {
		// 	instr += Math.floor(Math.random() * 10);
		// }
		logger.sforce(stopwatch.startAndPrint('Random Data Generation'));
		while (instr.length < size) {
			instr += Math.floor(10000000 + Math.random() * 89999999);
		}
		instr = instr.slice(0, size);
		logger.sforce(stopwatch.stopAndPrint('Random Data Generation'));

		var blob = doh.dc.Blob;
		blob.CopyFrom(instr);
		logger.sforce('instr: %s', instr);
		if (size !== instr.length) {
			abortWithFatalError('Could not generate requested test sample size');
		}

		var outstr = '', line = '';
		function addAndPrint(line) {
			outstr += line + '\n'; logger.sforce(line);
		}
		addAndPrint('');
		addAndPrint(sprintf('  -- %s Benchmark --', Global.SCRIPT_NAME));
		addAndPrint('');
		addAndPrint(sprintf('Testing all algorithms with a randomly generated input string in memory, in SINGLE THREAD ONLY.'));
		addAndPrint('');
		addAndPrint(sprintf('This is the best ever your CPU can do using DOpus & this script, when file access overhead is eliminated.'));
		addAndPrint('');
		addAndPrint(sprintf('Repetitions: %d', count));
		addAndPrint(sprintf('Input Size: %s',size.formatAsSize()));
		addAndPrint('');
		addAndPrint(sprintf('  -- Theoretical MT/%dx Limit --', maxcount));
		addAndPrint('');
		addAndPrint('The speed you would reach if:');
		addAndPrint(' - All your CPU cores run at the same clock (likely)');
		addAndPrint(' - There is no file access overhead at all (impossible, but can be reduced using an SSD, NVMe or RAMDisk)');
		addAndPrint(sprintf(' - All selected files can be perfectly split among threads, i.e. they are of equal size and total number is an integer multiple of %d (highly unlikely)', maxcount));
		addAndPrint('');

		for (var i = 0; i < algorithms.length; i++) {
			var algo = algorithms[i];
			var id = sprintf('%20s', algo);

			addAndPrint(sprintf('Testing algorithm: ' + algo.toUpperCase()));
			stopwatch.start(id);
			for (var j = 0; j < count; j++) {
				var dummy = doh.fsu.Hash(blob, algo);
			}
			var elapsed = stopwatch.getElapsed(id);
			var avgSpeed = size * count * 1000 / elapsed;
			stopwatch.stop(id);
			addAndPrint(sprintf('Average ST/1x speed     : %s/sec', avgSpeed.formatAsSize()));
			addAndPrint(sprintf('Theoretical MT/%dx Limit: %s/sec', maxcount, (avgSpeed * maxcount).formatAsSize() ));
			addAndPrint('');
		}
		showMessageDialog(null, outstr, 'CPU Benchmark Results');
	}

	/**
	 * @param {Object} driveLetters object which maps driveLetter, e.g. Y: to the number of files found under it (this function ignores it)
	 * @returns {string|false} drive type, e.g. HDD, SDD on success, false on error
	 */
	function detectDriveType(driveLetters) {
		var fnName = funcNameExtractor(detectDriveType);


		var ts = now();
		var cmd = 'wmic logicaldisk get deviceid,volumeserialnumber > Y:\\test.txt';
		logger.sverbose('Running: %s', cmd);
		util.shell.Run(cmd, 0, true); // 0: hidden, true: wait
		doh.out('WMIC Partition Query Duration: ' + (now() - ts) + ' ms');
		/**
		 * First time:
		 * - run wmic and get all drive letters and volume serial numbers
		 * - run powershell and detect HDD/SSDs
		 * - if any HDDs detected or some letters cannot be detected, ask user if the detection is correct
		 * - put everything into a DOpus.Vars variable
		 *
		 * At every run:
		 * - run wmic and get all drive letters and volume serial numbers
		 * - check if the volume serial number is known for the target partitions
		 * - if known use the previously detected drive type (without running powershell)
		 * - if unknown, run powershell again for the drive letter
		 * - if an HDD is detected or it cannot be detected, ask user if the detection is correct
		 */

		logger.snormal(stopwatch.startAndPrint(fnName, 'Drive Type Detection'));
		for (var driveLetter in driveLetters) {
			if (!driveLetters.hasOwnProperty(driveLetter)) continue; // skip prototype functions, etc.
			var tempPSOutFile = util.shell.ExpandEnvironmentStrings(TEMPDIR) + '\\' + Global.SCRIPT_NAME + '.tmp.txt';
			var cmd = 'PowerShell.exe "Get-Partition –DriveLetter ' + driveLetter.slice(0,1) + ' | Get-Disk | Get-PhysicalDisk | Select MediaType | Select-String \'(HDD|SSD)\'" > "' + tempPSOutFile + '"';
			logger.sverbose('%s -- Running: %s', fnName, cmd);
			util.shell.Run(cmd, 0, true); // 0: hidden, true: wait
			var sContents = FS.readFile(tempPSOutFile, FS.TEXT_ENCODING.utf16);
			doh.cmd.RunCommand('Delete /quiet /norecycle "' + tempPSOutFile + '"');
			if (!sContents) {
				logger.snormal('%s -- Could not determine disk type of %s, assuming SSD', fnName, driveLetter);
			} else {
				// @ts-ignore - sContents is string! wth are you talking about tsc?
				var driveType = sContents.replace(/.+\{MediaType=([^}]+)\}.+/mg, '$1').trim();
				logger.sverbose('%s -- Detemined disk type for %s is %s', fnName, driveLetter, driveType);
				// if (driveType === 'HDD' && command.maxcount > REDUCE_THREADS_ON_HDD_TO) {
				// 	var driveDetectMsg = sprintf('This drive seems to be an %s.\n\nThe script will automatically reduce the number of threads to avoid disk thrashing.\nOld # of Threads: %d\nNew # of Threads	: %d\n\nIf you press Cancel, the old value will be used instead.\nIs this drive type correct?', driveType, command.maxcount, REDUCE_THREADS_ON_HDD_TO);
				// 	var result = showMessageDialog(doh.getDialog(cmdData), driveDetectMsg, 'Drive Type detection', 'OK|Cancel');
				// 	if (result && command.maxcount > 1) command.maxcount = REDUCE_THREADS_ON_HDD_TO;
				// }
			}
		}
		logger.snormal(stopwatch.stopAndPrint(fnName, 'Drive Type Detection'));
		return driveType || false;
	}

}


/*
	8888888b.   .d88888b.  8888888b.  888     888  .d8888b.      888    888 8888888888 888      8888888b.  8888888888 8888888b.   .d8888b.
	888  "Y88b d88P" "Y88b 888   Y88b 888     888 d88P  Y88b     888    888 888        888      888   Y88b 888        888   Y88b d88P  Y88b
	888    888 888     888 888    888 888     888 Y88b.          888    888 888        888      888    888 888        888    888 Y88b.
	888    888 888     888 888   d88P 888     888  "Y888b.       8888888888 8888888    888      888   d88P 8888888    888   d88P  "Y888b.
	888    888 888     888 8888888P"  888     888     "Y88b.     888    888 888        888      8888888P"  888        8888888P"      "Y88b.
	888    888 888     888 888        888     888       "888     888    888 888        888      888        888        888 T88b         "888
	888  .d88P Y88b. .d88P 888        Y88b. .d88P Y88b  d88P     888    888 888        888      888        888        888  T88b  Y88b  d88P
	8888888P"   "Y88888P"  888         "Y88888P"   "Y8888P"      888    888 8888888888 88888888 888        8888888888 888   T88b  "Y8888P"
*/
{

	// I only wanted a little bit better CodeCompletion...
	// ...4 hours later...
	// at least I can reuse them now

	/**
	 * @constructor
	 */
	function DOpusItem () {
		abortWithFatalError('You cannot instantitate this class, it is only for JSDOC');
		/** @property {Date} access Returns the "last accessed" Date, in local time. */
		this.access = new Date();
		/** @property {Date} access_utc Returns the "last accessed" Date, in UTC. */
		this.access_utc = new Date();
		/** @property {number} attr Returns the item attributes. This value is a series of flags that are logically OR'd together. The attributes supported by Opus are: 1: read only, 2: hidden, 4: system, 32: archive, 1024: reparse ponumber (junctions, etc.), 2048: compressed, 4096: offline storage, 8192: not content-indexed, 16384: encrypted, 524288: pinned */
		this.attr = 0;
		/** @property {string} attr_text Returns the item attributes as a string, as displayed in the file display. */
		this.attr_text = '';
		/** @property {boolean} checked Returns True if the item was checked (in checkbox mode), or False otherwise. */
		this.checked = false;
		/** @property {Date} create Returns the "creation" Date, in local time. */
		this.create = new Date();
		/** @property {Date} create_utc Returns the "creation" Date, in UTC. */
		this.create_utc = new Date();
		/** @property {boolean} current For Item objects obtained from a Viewer, this property is True if the item represents the currently displayed image and False otherwise. */
		this.current = false;
		/** @property {string} display_name Returns the display name of the item. Only a few items have a display name that is different to their actual name - some examples are certain system folders (like C:\Users which might have a translated display name in non-English locales). */
		this.display_name = '';
		/** @property {string} ext Returns the filename extension. */
		this.ext = '';
		/** @property {string} ext_m Returns the filename extension, taking multi-part extensions numbero account. For example, a file called "file.part1.rar" might return ".rar" for ext but ".part1.rar" for ext_m. */
		this.ext_m = '';
		/** @property {boolean} failed Returns True if the item failed when used by a command. This is only meaningful in conjunction with the Command.files collection - once the command has returned, this property will indicate success or failure on a per-file basis. */
		this.failed = false;
		/** @property {object} fileattr Returns a FileAttr object that represents the item's attributes. */
		this.fileattr = {};
		/** @property {object} filegroup If the file display this item came from is grouped by a particular column, this property returns a FileGroup object representing the group the item is in. If the item has no group this will return an empty string. */
		this.filegroup = {};
		/** @property {boolean} focus For Item objects obtained from a file display, this property is True if the object represents the item with focus, and False otherwise. Only one item can have focus at a time. The item with focus is typically shown with an outline around it, and is usually the last item which was clicked on, or which was moved to with the keyboard. The item with focus is often also one of the selected items, but not always; selection and focus are two separate things. */
		this.focus = false;
		/** @property {boolean} got_size Returns True for folder items if their size has been calculated by, for example, the GetSizes command. If False, the size property will be unreliable for folders. */
		this.got_size = false;
		/** @property {DOpusVector} groups a Vector of FiletypeGroup objects representing any and all file type groups that this file is a member of. */
		this.groups = {};
		/** @property {DOpusMap} groupsobject Similar to the groups property, except a FiletypeGroups object is returned instead of a Vector. */
		this.groupsobject = {};
		/** @property {number} id This is a unique ID for the item; it is used numberernally by Opus. */
		this.id = 0;
		/** @property {boolean} is_dir Returns True if the item represents a folder, and False for a file. */
		this.is_dir = false;
		/** @property {boolean} is_junction Returns True if the item is a junction to another folder. */
		this.is_junction = false;
		/** @property {boolean} is_reparse Returns True if the item is a reparse ponumber. */
		this.is_reparse = false;
		/** @property {boolean} is_symlink Returns True if the item is a symbolic link. */
		this.is_symlink = false;
		/** @property {object} metadata a Metadata object that provides access to the item's metadata. */
		this.metadata = {};
		/** @property {Date} modify Returns the "last modified" Date, in local time. */
		this.modify = new Date();
		/** @property {Date} modify_utc Returns the "last modified" Date, in UTC. */
		this.modify_utc = new Date();
		/** @property {string} name Returns the name of the item. */
		this.name = '';
		/** @property {string} name_stem Returns the filename "stem" of the item. This is the name of the item with the filename extension removed. It will be the same as the name for folders. */
		this.name_stem = '';
		/** @property {string} name_stem_m Returns the filename "stem" of the item, taking multi-part extensions numbero account. For example, a file called "file.part1.rar" might return "file.part1" for name_stem but "file" for name_stem_m. */
		this.name_stem_m = '';
		/** @property {DOpusPath} path Returns the path of the item's parent folder. This does not include the name of the item itself, which can be obtained via the name property. */
		this.path = {};
		/** @property {DOpusPath} realpath Returns the "real" path of the item. For items located in virtual folders like Libraries or Collections, this lets you access the item's underlying path in the real file system. The realpath property includes the full path to the item, including its own name. */
		this.realpath = {};
		/** @property {boolean} selected Returns True if the item was selected, or False otherwise. */
		this.selected = false;
		/** @property {DOpusPath} shortpath the short path of the item, if it has one. Note that short paths are disabled by default in Windows 10. */
		this.shortpath = {};
		/** @property {string} size Returns the size of the item as a FileSize object. */
		this.size = '';
		/** @property {function} InGroup Tests the file for membership of the specified file type group. */
		this.InGroup = function(){};
		/** @property {function} LabelsThis method returns a Vector of strings representing any labels that have been assigned to the item. */
		this.Labels = function(){};
		/**
		 * @property {function} Open Opens this file and returns a File object that lets you access its contents as binary data.
		 * @returns {object}
		 */
		this.Open = function(flag){};
		/** @property {function} ShellProp Returns the value of the specified shell property for the item. The property argument can be the property's PKEY or its name. */
		this.ShellProp = function(){};
		/** @property {function} Update Updates the Item object from the file on disk. You might use this if you had run a command to change an item's timestamp or attributes, and wanted to retrieve the new information. */
		this.Update = function(){};
	}

	/**
	 * @constructor
	 */
	function DOpusVector () {
		abortWithFatalError('You cannot instantitate this class, it is only for JSDOC');
		/** @property {number} capacity Returns the capacity of the Vector (the number of elements it can hold without having to reallocate memory). This is not the same as the number of elements it currently holds, which can be 0 even if the capacity is something larger. */
		this.capacity = 0;
		/** @property {number} count Returns the number of elements the Vector currently holds. */
		this.count = 0;
		/** @property {boolean} empty Returns True if the Vector is empty, False if not. */
		this.empty = false;
		/** @property {number} length A synonym for count. */
		this.length = 0;
		/** @property {number} size A synonym for count. */
		this.size = 0;
		/**
		 * Copies the values of another Vector to the end of this one, preserving the existing values as well. If start and end are not provided, the entire Vector is appended - otherwise, only the specified elements are appended. In JScript you can pass a standard array to this method to copy the array to the end of a Vector.
		 * @param {DOpusVector} fromVector
		 * @param {number} start
		 * @param {number} end
		 * @returns
		 */
		this.append = function (fromVector, start, end) {}

		/**
		 * Copies the value of another Vector to this one. If start and end are not provided, the entire Vector is copied - otherwise, only the specified elements are copied. Instead of a Vector object you can also pass a collection to this method and the contents of the collection will be copied to the Vector. In JScript you can pass a standard array to this method to copy the array into a Vector.
		 * @param {DOpusVector} fromVector
		 * @param {number} start
		 * @param {number} end
		 * @returns
		 */
		this.assign = function (fromVector, start, end) {}

		/**
		 * Returns the last element in the Vector.
		 * @returns {any}
		 */
		this.back = function () {}

		/**
		 * Clears the contents of the Vector.
		 */
		this.clear = function () {}

		/**
		 * Erases the element at the specified index.
		 * @param {number} index
		 */
		this.erase = function (index) {}

		/**
		 * Exchanges the positions of the two specified elements.
		 * @param {number} index1
		 * @param {number} index2
		 */
		this.exchange = function (index1, index2) {}

		/**
		 * Returns the first element in the Vector.
		 * @returns {any}
		 */
		this.front = function () {}

		/**
		 * Inserts the provided value at the specified position.
		 * @param {number} index1
		 * @param {any} value
		 */
		this.insert = function (index1, value) {}

		/**
		 * Removes the last element of the Vector.
		 */
		this.pop_back = function () {}

		/**
		 * Adds the provided value to the end of the Vector.
		 * @param {any} value
		 */
		this.push_back = function (value) {}

		/**
		 * Reserves space in the Vector for the specified number of elements (increases its capacity, although the count of elements remains unchanged). Note that Vectors grow dynamically - you don't have to specifically reserve or resize them. However if you want to add a large number of elements to a Vector it can be more efficient to reserve space for them first.
		 * @param {number} capacity
		 */
		this.reserve = function (capacity) {}

		/**
		 * Resizes the Vector to the specified number of elements. Any existing elements past the new size of the Vector will be erased.
		 * @param {number} size
		 */
		this.resize = function (size) {}

		/**
		 * Reduces the capacity of the Vector to the number of elements it currently holds.
		 */
		this.shrink_to_fit = function () {}

		/**
		 * Sorts the contents of the Vector. Strings and numbers are sorted alphabetically and numerically - other elements are grouped by type but not specifically sorted in any particular order.
		 */
		this.sort = function () {}

		/**
		 * Removes all but one of any duplicate elements from the Vector. The number of elements removed is returned.
		 * @returns {number}
		 */
		this.unique = function () { return 0; }
	}

	/**
	 * @constructor
	 */
	function DOpusMap () {
		abortWithFatalError('You cannot instantitate this class, it is only for JSDOC');
		/** @property {number} count   Returns the number of elements the Map currently holds. */
		this.count = 0;
		/** @property {boolean} empty  Returns True if the Map is empty, False if not. */
		this.empty = false;
		/** @property {number} length  A synonym for count. */
		this.length = 0;
		/** @property {number} size    A synonym for count. */
		this.size = 0;
		/**
		 * Copies the contents of another Map to this one.
		 * @param {DOpusMap} mapFrom
		 * @returns
		 */
		this.assign = function (mapFrom) {}
		/**
		 * Clears the contents of the Map.
		 * @returns
		 * */
		this.clear = function () {}
		/**
		 * Erases the element matching the specified key, if it exists in the map.
		 * @param {any} key
		 * @returns
		 */
		this.erase = function (key) {}
		/**
		 * Returns True if the specified key exists in the map.
		 * @param {any} key
		 * @returns {boolean}
		 */
		this.exists = function (key) { return false; }
		/**
		 * Merges the contents of another Map with this one.
		 * @param {DOpusMap} mapFrom
		 * @returns
		 */
		this.merge = function (mapFrom) {}
	}

	/**
	 * @constructor
	 */
	function DOpusPath () {
		abortWithFatalError('You cannot instantitate this class, it is only for JSDOC');
		/** @property {number} Returns the number of elements the Map currently holds*/
		this.count = 0;
		/**
		 * @param {object} mapFrom
		 */
		this.assign = function (mapFrom) {}
	}


	// doh: DOpus Helper
	var doh = (function (){
		var myName = 'doh';
		function _validate(cmdData) {
			if (!cmdData.func || !cmdData.func.sourcetab) {
				throw new Error('this object type is not supported');
			}
			return true;
		}
		return {
			name: myName,
			// @ts-ignore
			dc: DOpus.Create,
			// @ts-ignore
			cmd: DOpus.Create.Command,
			// @ts-ignore
			st: DOpus.Create.StringTools,
			// @ts-ignore
			fsu: DOpus.FSUtil,
			// @ts-ignore
			sv: Script.Vars,
			/**
			 * DOpus.Output wrapper
			 * @param {string} string
			 */
			out: function (string) {
				// @ts-ignore
				DOpus.Output(string);
			},
			/**
			 * DOpus.ClearOutput wrapper
			 */
			clear: function () {
				// @ts-ignore
				DOpus.ClearOutput();
			},
			/**
			 * DOpus.Delay wrapper
			 * @param {number} millisecs to sleep
			 */
			delay: function (millisecs) {
				// @ts-ignore
				DOpus.Delay(millisecs);
			},
			/**
			 * DOpus.Dlg() wrapper
			 * @returns {object}
			 */
			dlg: function () {
				// @ts-ignore
				return DOpus.Dlg();
			},
			/**
			 * util.fu.GetItem wrapper
			 * @param {string} sPath file full path
			 * @returns {DOpusItem} DOpus Item object
			 */
			getItem: function (path) {
				if (typeof path !== 'string') {
					throw new Error('Expected path string, got type: ' + typeof path + ', value:  ' + path);
				}
				var _tmp = doh.fsu.GetItem(path);
				return this.isValidDOItem(_tmp) ? _tmp : false;
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {boolean} true if DOpus item
			 */
			isValidDOItem: function (oItem) {
				return (typeof oItem === 'object' && typeof oItem.realpath !== 'undefined' && typeof oItem.modify !== 'undefined');
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {boolean} true if DOpus file, false if dir, reparse, junction, symlink
			 */
			isFile: function (oItem) {
				return (typeof oItem === 'object' && oItem.realpath && !oItem.is_dir && !oItem.is_reparse && !oItem.is_junction && !oItem.is_symlink);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {boolean} true if DOpus directory, false if file, reparse, junction, symlink
			 */
			isDir: function (oItem) {
				return (typeof oItem === 'object' && typeof oItem.realpath !== 'undefined' && oItem.is_dir === true);
			},
			/**
			 * @param {DOpusItem} oItem DOpus Item object
			 * @returns {boolean} true if DOpus file or directory, false if reparse, junction, symlink
			 */
			isDirOrFile: function (oItem) {
				return (typeof oItem === 'object' && oItem.realpath && !oItem.is_reparse && !oItem.is_junction && !oItem.is_symlink);
			},
			/**
			 * @param {object} oCmdData DOpus command data
			 * @returns {boolean} true if DOpus command data
			 */
			isValidDOCommandData: function (oCmdData) {
				return (typeof oCmdData === 'object' && oCmdData.func && oCmdData.func.Dlg);
			},
			/**
			 * @param {object} oColData DOpus column data
			 * @returns {boolean} true if DOpus column data
			 */
			isValidDOColumnData: function (oColData) {
				return (typeof oColData === 'object' && typeof oColData.value !== 'undefined' && typeof oColData.group !== 'undefined');
			},
			/**
			 * @param {object} oMap DOpus Map
			 * @returns {boolean} true if DOpus Map
			 */
			isValidDOMap: function (oMap) {
				return (typeof oMap === 'object' && typeof oMap.capacity === 'undefined' && typeof oMap.count !== 'undefined' && typeof oMap.length !== 'undefined' && oMap.count === oMap.length);
			},
			/**
			 * @param {object} oVector DOpus Vector
			 * @returns {boolean} true if DOpus Vector
			 */
			isValidDOVector: function (oVector) {
				return (typeof oVector === 'object' && typeof oVector.capacity !== 'undefined' && typeof oVector.count !== 'undefined' && typeof oVector.length !== 'undefined' && oVector.count === oVector.length);
			},
			/**
			 * @param {object} oAny any enumerable object, e.g. scriptCmdData.func.sourcetab.selected
			 * @returns {boolean}
			 */
			isValidDOEnumerable: function (oAny) {
				try {
					var e = new Enumerator(oAny);
					return (e && typeof e.atEnd === 'function' && typeof e.moveNext === 'function');
				} catch(e) { return false }
			},

			// current tab's path
			getCurrentPath: function (cmdData) {
				// auto convert to string, and make sure it has a trailing slash
				return _validate(cmdData) && (''+cmdData.func.sourcetab.path).normalizeTrailingBackslashes();
			},

			// if the current lister tab is 'dirty'
			isTabDirty: function (cmdData) {
				return _validate(cmdData) && !!cmdData.func.sourcetab.dirty;
			},
			// dialog
			getDialog: function (cmdData) {
				return _validate(cmdData) && cmdData.func.Dlg;
			},
			// progress bar
			getProgressBar: function (cmdData) {
				return _validate(cmdData) && cmdData.func.command.progress;
			},

			// all - DOpus enumerables
			getAllItems: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.all;
			},
			getAllDirs: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.dirs;
			},
			getAllFiles: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.files;
			},
			// selected - DOpus enumerables
			getSelItems: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected;
			},
			getSelDirs: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected_dirs;
			},
			getSelFiles: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selected_files;
			},

			// get single selected file directly as item
			getSelFileAsItem: function (cmdData) {

				return _validate(cmdData) && doh.fsu.GetItem(new Enumerator(cmdData.func.sourcetab.selected_files).item());
			},

			// all items, dirs, files - selstats takes checkbox mode into account
			getAllItemsCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.items;
			},
			getAllDirsCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.dirs;
			},
			getAllFilesCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.files;
			},
			// selected items, dirs, files - selstats takes checkbox mode into account
			getSelItemsCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.selitems;
			},
			getSelDirsCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.seldirs;
			},
			getSelFilesCount: function (cmdData) {
				return _validate(cmdData) && cmdData.func.sourcetab.selstats.selfiles;
			},
			getGlobalVar: function(key, val) {
				// @ts-ignore
				return DOpus.vars.Get(key);
			},
			setGlobalVar: function(key, val) {
				// @ts-ignore
				DOpus.vars.Set(key, val);
			},
			loadResources: function(name) {
				// @ts-ignore
				Script.LoadResources(name);
			}
		}
	}());
}



/*
	 .d8888b.  888     888  .d8888b. 88888888888  .d88888b.  888b     d888      .d88888b.  888888b. 888888 8888888888  .d8888b. 88888888888  .d8888b.
	d88P  Y88b 888     888 d88P  Y88b    888     d88P" "Y88b 8888b   d8888     d88P" "Y88b 888  "88b  "88b 888        d88P  Y88b    888     d88P  Y88b
	888    888 888     888 Y88b.         888     888     888 88888b.d88888     888     888 888  .88P   888 888        888    888    888     Y88b.
	888        888     888  "Y888b.      888     888     888 888Y88888P888     888     888 8888888K.   888 8888888    888           888      "Y888b.
	888        888     888     "Y88b.    888     888     888 888 Y888P 888     888     888 888  "Y88b  888 888        888           888         "Y88b.
	888    888 888     888       "888    888     888     888 888  Y8P  888     888     888 888    888  888 888        888    888    888           "888
	Y88b  d88P Y88b. .d88P Y88b  d88P    888     Y88b. .d88P 888   "   888     Y88b. .d88P 888   d88P  88P 888        Y88b  d88P    888     Y88b  d88P
	 "Y8888P"   "Y88888P"   "Y8888P"     888      "Y88888P"  888       888      "Y88888P"  8888888P"   888 8888888888  "Y8888P"     888      "Y8888P"
	                                                                                                 .d88P
	                                                                                               .d88P"
	                                                                                              888P"
*/
{

	// TheNewSummary
	{
		// TODO - REVIEW
		/**
		 * @typedef TheNewSummary
		 * @type {object}
		 *
		 * @property {string} name
		 *
		 * @property {number} tsStart
		 * @property {number} tsFinish
		 * @property {number} tsElapsed
		 *
		 * @property {boolean} isAborted
		 * @property {boolean} isTimedOut
		 *
		 * @property {number} cntTotal
		 * @property {number} cntSuccess
		 * @property {number} cntSkipped files which are not selected by the filtering criteria (e.g. non-dirty files)
		 * @property {number} cntError files which did not pass the verification or could not be updated because of read-only flag, etc.
		 * @property {number} cntUnfinished files which did not finish until max wait is reached or user aborted
		 *
		 * @property {number} sizeTotal
		 * @property {number} sizeSuccess
		 * @property {number} sizeSkipped files which are not selected by the filtering criteria (e.g. non-dirty files)
		 * @property {number} sizeError files which did not pass the verification or could not be updated because of read-only flag, etc.
		 * @property {number} sizeUnfinished files which did not finish until max wait is reached or user aborted
		 *
		 * @property {number} averageSpeed
		 *
		 * @property {number} maxElapsedForThreadDuration
		 * @property {number} maxElapsedForThreadSize
		 *
		 * @property {string} maxElapsedForFileName
		 * @property {number} maxElapsedForFileSize
		 * @property {number} maxElapsedForFileDuration
		 *
		 * @property {string} earliestFileFullpath
		 * @property {string} earliestFileName
		 * @property {number} earliestFileDate
		 * @property {number} earliestFileSize
		 *
		 * @property {string} latestFileFullpath
		 * @property {string} latestFileName
		 * @property {number} latestFileDate
		 * @property {number} latestFileSize
		 *
		 * @property {string} smallestFileFullpath
		 * @property {string} smallestFileName
		 * @property {number} smallestFileDate
		 * @property {number} smallestFileSize
		 *
		 * @property {string} largestFileFullpath
		 * @property {string} largestFileName
		 * @property {number} largestFileDate
		 * @property {number} largestFileSize
		 */

		/**
		 * @typedef TheNewSummaryAndErrorTexts
		 * @type {object}
		 * @property {TheNewSummary} summary
		 * @property {items} HashedItemsCollection
		 */
	}


	// ManagerCommand
	{
		/**
		 * Manager Command object
		 * @param {string} command command name
		 * @param {boolean} recurse if subdirs should be processed
		 * @param {number} maxcount maximum number of threads to use
		 * @param {function} fnFilter filter function, see filters.PUBLIC
		 * @param {function} fnAction callback action function, see actions.PUBLIC
		 * @param {string} collectionName collection name to use for results
		 * @param {string=} fileName file name to use for results
		 * @param {string=} fileFormat file format to use for results
		 * @param {number=} benchSize benchmark input size
		 * @param {number=} benchCount benchmark iterations count
		 * @constructor
		 * @see filters.PUBLIC
		 * @see actions.PUBLIC
		 */
		function ManagerCommand(command, recurse, maxcount, fnFilter, fnAction, collectionName, fileName, fileFormat, benchSize, benchCount) {
			if (typeof fnFilter !== 'function' || typeof fnAction !== 'function') {
				abortWithFatalError('Given filter or action is not a function:\n' + fnFilter + '\n' + fnAction);
			}
			this.command     = command;
			this.recurse     = recurse;
			this.maxcount    = maxcount;
			this.filter      = fnFilter;
			this.action      = fnAction;
			this.collName    = collectionName;
			this.fileName    = fileName;
			this.fileFormat  = fileFormat;
			this.benchSize   = benchSize;
			this.benchCount  = benchCount;
			this.filterName  = filters.getName(this.filter);
			this.actionName  = actions.getName(this.action);
		}
	}


	// Result
	{
		/**
		 * Generic Result object
		 * @param {any=} oOKValue value on success
		 * @param {any=} oFailValue value on error/failure
		 * @param {any=} oSkipValue value on skip (neither success, nor error, e.g. due to filtering)
		 */
		function Result(oOKValue, oFailValue, oSkipValue) {
			this.ok        = oOKValue;
			this.err       = oFailValue;
			this.skip      = oSkipValue;
		}
		Result.prototype.isOK      = function () { return this.ok && !this.err && !this.skip }
		Result.prototype.isErr     = function () { return this.err ? true : false }
		Result.prototype.isSkipped = function () { return this.skip ? true : false }
		Result.prototype.toString  = function () { return JSON.stringify(this, null, 4) }
		/**
		 * wrapper for Result
		 * @param {any=} oOKValue
		 * @returns {Result}
		 */
		function ResultSuccess(oOKValue) {
			return new Result(oOKValue||true, false, false);
		}
		/**
		 * wrapper for Result
		 * @param {any=} oFailValue
		 * @returns {Result}
		 */
		function ResultError(oFailValue) {
			return new Result(false, oFailValue||true, false);
		}
		/**
		 * wrapper for Result
		 * @param {any=} oSkipValue
		 * @returns {Result}
		 */
		function ResultSkipped(oSkipValue) {
			return new Result(false, false, oSkipValue||true);
		}
	}


	// CachedItem
	{
		function packageAsPOJO(oItem, hash) {
			if (!doh.isValidDOItem(oItem)) {
				logger.serror('packageAsPOJO -- Expected DOpus Item, got: %s, type: %s', oItem, typeof oItem); return false;
			}
			return {
				last_modify         : new Date(oItem.modify).getTime(),
				last_modify_friendly: new Date(oItem.modify).getTime().formatAsDateTimeCompact(),
				last_size           : parseInt(oItem.size, 10),
				algorithm           : CURRENT_ALGORITHM,
				hash                : hash
			};
		}
		/**
		 * ADS-Cached Item
		 * @param {DOpusItem} oItem DOpus Item object
		 * @param {Date} modify file mod date
		 * @param {number} size file size
		 * @param {string} hash hash checksum
		 * @param {string=} algorithm algorithm used
		 * @constructor
		 */
		function CachedItem(oItem, modify, size, hash, algorithm) {
			if (!doh.isValidDOItem(oItem)) {
				throw new Error('Expected DOpus item object');
			}
			this.last_modify          = modify || new Date(oItem.modify).getTime();
			this.last_modify_friendly = this.last_modify.formatAsDateTimeCompact();
			this.last_size            = size || parseInt(oItem.size, 10);
			this.hash                 = hash;
			this.algorithm            = algorithm || CURRENT_ALGORITHM;
		}
		CachedItem.prototype.enrichWithCacheFields = function () {
			// add cache only attributes for tooltips, etc.
			this.added_to_cache          = new Date().getTime();
			this.added_to_cache_friendly = this.added_to_cache.formatAsDateTimeCompact();
			return JSON.stringify(this);
		}
		CachedItem.prototype.removeCacheFields = function () {
			delete this.added_to_cache;
			delete this.added_to_cache_friendly;
		}
		// these do not work
		// CachedItem.prototype = Object.Create(BaseItem.prototype);
		// CachedItem.prototype = new BaseItem();
		// CachedItem.prototype.constructor = CachedItem;
	}


	// HashedItem & HashedItemsCollection
	{

		/**
		 * Hashed Item
		 * @param {DOpusItem} oItem DOpus Item object
		 * @param {string=} relpath relative path
		 * @param {string=} hash hash value
		 * @param {string=} algorithm algorithm, e.g. 'sha1'
		 * @param {any=} error any error message string or object
		 * @param {any=} skipped amy message if item was skipped by filters
		 */
		function HashedItem(oItem, relpath, hash, algorithm, error, skipped) {
			if (!doh.isValidDOItem(oItem)) {
				throw new Error('Expected DOpus item object');
			}
			this.item      = oItem;
			this.fullpath  = ''+oItem.realpath || '';
			this.size      = parseInt(0+oItem.size, 10) || 0;
			this.mod_ts    = new Date(oItem.modify).getTime() || 0;
			this.mod_date  = this.mod_ts.formatAsDateTimeCompact();
			this.relpath   = ''+relpath || '';
			this.name      = ''+oItem.name;

			this.hash      = hash || '';
			this.algorithm = algorithm || '';
			this.error     = error;
			this.skipped   = skipped || false;

			this.elapsed   = 0;
			this.finished  = false;
			this.finalized = false;
		}
		/**
		 * @param {string} currentPath base path to use
		 * @returns {string} relative path
		 */
		HashedItem.prototype.getRelativeToPath = function (currentPath) {
			if (currentPath) {
				this.relpath = this.fullpath.replace(currentPath, '') || this.relpath;
			}
			return this.relpath;
		}
		/**
		 * mark item as finished - relevant for thread monitoring
		 */
		HashedItem.prototype.markFinished = function () {
			this.finished = true;
		}



		var TS_MAX_VALID = 253402214400000; // 9999-12-31
		var TS_MIN_VALID = 0;               // 1970-01-01
		/**
		 * General Purpose Hashed Items Collection
		 * @constructor
		 */
		function HashedItemsCollection() {
			/**
			 * apparently either one works: https://stackoverflow.com/a/51075508
			 * type {Object.<string, HashedItem>}
			 * type {{string, HashedItem}}
			 * @type {Object.<string, HashedItem>}
			 */
			this._myItems     = {};

			this.sizeTotal    = 0;
			this.sizeSuccess  = 0;
			this.sizeError    = 0;
			this.sizeSkipped  = 0;

			this.countTotal   = 0;
			this.countSuccess = 0;
			this.countError   = 0;
			this.countSkipped = 0;

			this.driveLetters = {};
		}
		/**
		 * do not call directly!
		 * @param {function} fnFilter filter
		 * @returns {Object.<string, HashedItem>}
		 */
		HashedItemsCollection.prototype._filterByAttribute = function (fnFilter) {
			/** @type {Object.<string, HashedItem>} */
			var out = {};
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				if (fnFilter(this._myItems[fp])) out[fp] = this._myItems[fp];
			}
			return out;
		}
		/**
		 * do not call directly!
		 * @param {function} fnFilter filter
		 * @param {number} startValue start value, e.g. TS_MAX_VALID, largest file size, etc.
		 */
		HashedItemsCollection.prototype._findMinByAttribute = function (fnFilter, startValue) {
			var lastFoundVal = startValue, lastFoundItem;
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				var _tmp = fnFilter(this._myItems[fp]);
				if (_tmp <= lastFoundVal) { // use <= instead of < to guarantee there will be always a result
					lastFoundVal  = _tmp;
					lastFoundItem = this._myItems[fp];
				}
			}
			return lastFoundItem;
		}
		/**
		 * do not call directly!
		 * @param {function} fnFilter filter
		 * @param {number} startValue start value, e.g. TS_MIN_VALID, smallest file size (0), etc.
		 */
		HashedItemsCollection.prototype._findMaxByAttribute = function (fnFilter, startValue) {
			var lastFoundVal = startValue, lastFoundItem;
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				var _tmp = fnFilter(this._myItems[fp]);
				if (_tmp >= lastFoundVal) { // use >= instead of > to guarantee there will be always a result, e.g. to find 0 byte files if we start with 0
					lastFoundVal  = _tmp;
					lastFoundItem = this._myItems[fp];
				}
			}
			return lastFoundItem;
		}
		/**
		 * @param {HashedItem} oHashedItem item to add
		 * @see HashedItem
		 */
		HashedItemsCollection.prototype.addItem = function (oHashedItem) {
			if (!(oHashedItem instanceof HashedItem)) {
				throw new Error('Expected HashedItem object, got:\n' + dumpObject(oHashedItem));
			}
			if (this._myItems[oHashedItem.fullpath]) {
				throw new Error('Item cannot be added, already in collection:\n' + dumpObject(oHashedItem));
			}
			// add the item to the list
			this._myItems[oHashedItem.fullpath] = oHashedItem;
			this.sizeTotal += oHashedItem.size; this.countTotal++;

			// increment the drive letter count for this file
			var driveLet = oHashedItem.fullpath.slice(0,2);
			if (!this.driveLetters[driveLet]) this.driveLetters[driveLet] = 0;
			this.driveLetters[driveLet]++;

			// adjust the success, error & skipped counters
			if (oHashedItem.skipped) {
				this.sizeSkipped += oHashedItem.size; this.countSkipped++;
			} else if (oHashedItem.error) {
				this.sizeError   += oHashedItem.size; this.countError++;
			} else {
				this.sizeSuccess += oHashedItem.size; this.countSuccess++;
			}
		}
		/**
		 * @param {HashedItem} oHashedItem item to delete
		 * @see HashedItem
		 */
		HashedItemsCollection.prototype.delItem = function (oHashedItem) {
			if (!(oHashedItem instanceof HashedItem)) {
				throw new Error('Expected HashedItem object, got:\n' + dumpObject(oHashedItem));
			}
			if (!this._myItems[oHashedItem.fullpath]) {
				throw new Error('Item cannot be deleted, not in collection:\n' + dumpObject(oHashedItem));
			}

			// adjust the success, error & skipped counters
			if (oHashedItem.skipped) {
				this.sizeSkipped -= oHashedItem.size;  this.countSkipped--;
			} else if (oHashedItem.error) {
				this.sizeError   -= oHashedItem.size;  this.countError--;
			} else {
				this.sizeSuccess -= oHashedItem.size;  this.countSuccess--;
			}

			// remove the item from the list
			this.sizeTotal -= oHashedItem.size; this.countTotal--;
			delete this._myItems[oHashedItem.fullpath];

			// decrement the drive letter count for this file
			var driveLet = oHashedItem.fullpath.slice(0,2);
			this.driveLetters[driveLet]--;
		}
		/**
		 * @param {string} path full path
		 * @returns {HashedItem}
		 */
		HashedItemsCollection.prototype.getByPath = function (path) {
			if (typeof path !== 'string') {
				throw new Error('Expected path string, got type: ' + typeof path + ', value:  ' + path);
			}
			return this._myItems[path];
		}
		/**
		 * @param {DOpusItem} oItem DOpus item
		 * @returns {HashedItem}
		 */
		HashedItemsCollection.prototype.getItemByDOpusItem = function (oItem) {
			if (!doh.isValidDOItem(oItem)) {
				throw new Error('Expected DOpus Item, got type: ' + typeof oItem + ', value:  ' + oItem);
			}
			return this._myItems[''+oItem.realpath];
		}
		/**
		 * @param {string} rootPath starting path to use to adjust the relative paths
		 */
		HashedItemsCollection.prototype.adjustRelativePaths = function (rootPath) {
			rootPath = rootPath.normalizeTrailingBackslashes();
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				var oHashedItem = this._myItems[fp];
				var relativePathAndFileName = (''+oHashedItem.fullpath).replace(rootPath, '');
				oHashedItem.relpath = relativePathAndFileName.slice(0, relativePathAndFileName.lastIndexOf(''+oHashedItem.name));
			}
		}
		/**
		 * @param {string} algorithm
		 */
		HashedItemsCollection.prototype.setAlgorithmForAll = function (algorithm) {
			if (!algorithm) {
				abortWithFatalError('Given algorithm is invalid: ' + algorithm);
			}
			for(var fp in this._myItems) {
				if (!this._myItems.hasOwnProperty(fp)) continue;
				this._myItems[fp].algorithm = algorithm;
			}
		}
		/**
		 * @returns {Object.<string, HashedItem>} all items
		 */
		HashedItemsCollection.prototype.getItems          = function () { return this._myItems }
		/**
		 * @returns {Object.<string, HashedItem>} success items
		 */
		HashedItemsCollection.prototype.getSuccessItems   = function () { return this._filterByAttribute(function (o){ return !!!o.error && !!!o.skipped }) }
		/**
		 * @returns {Object.<string, HashedItem>} error items
		 */
		HashedItemsCollection.prototype.getErrorItems     = function () { return this._filterByAttribute(function (o){ return !!o.error }) }
		/**
		 * @returns {Object.<string, HashedItem>} skipped items
		 */
		HashedItemsCollection.prototype.getSkippedItems   = function () { return this._filterByAttribute(function (o){ return !!o.skipped }) }
		/**
		 * @returns {HashedItem} earliest item
		 */
		HashedItemsCollection.prototype.getEarliestItem   = function () { return this._findMinByAttribute(function (o){ return o.mod_ts }, TS_MAX_VALID) }
		/**
		 * @returns {HashedItem} latest item
		 */
		HashedItemsCollection.prototype.getLatestItem     = function () { return this._findMaxByAttribute(function (o){ return o.mod_ts }, TS_MIN_VALID) }
		/**
		 * @returns {HashedItem} smallest item
		 */
		HashedItemsCollection.prototype.getSmallestItem   = function () { return this._findMinByAttribute(function (o){ return o.size }, Math.pow(2, 50)) } // 1 petabyte, I doubt anybody will attempt to hash it! :D
		/**
		 * @returns {HashedItem} largest item
		 */
		HashedItemsCollection.prototype.getLargestItem    = function () { return this._findMaxByAttribute(function (o){ return o.size }, 0) }
		/**
		 * @returns {HashedItem} earliest item
		 */
		HashedItemsCollection.prototype.getMinElapsedItem = function () { return this._findMinByAttribute(function (o){ return o.elapsed }, TS_MAX_VALID) }
		/**
		 * @returns {HashedItem} largest item
		 */
		HashedItemsCollection.prototype.getMaxElapsedItem = function () { return this._findMaxByAttribute(function (o){ return o.elapsed }, 0)
		}
	}


	// CommandResults
	{
		/**
		 * General purpose Command Results, e.g. for conversion, filtering results, exporting, importing...
		 * incl. details about slowest thread, file, or largest, smallest, earliest, latest file, etc.
		 * All non-essential information is in the ExtInfo collection.
		 * All attribute names are in Capitalized_Words with underscores, which are used for example in exported files;
		 * the underscores are automatically replaced by space.
		 *
		 * @param {HashedItemsCollection} oHashedItemsColl
		 * @param {string} rootPath root path, not checked for validity
		 * @param {string=} algorithm hashing algorithm used, default: CURRENT_ALGORITHM
		 * @param {number=} tsStart start timestamp
		 * @param {number=} tsFinish finish timestamp
		 * @param {number=} slowestThreadDuration
		 * @param {number=} slowestThreadSize
		 * @constructor
		 */
		function CommandResults(oHashedItemsColl, rootPath, algorithm, tsStart, tsFinish, slowestThreadDuration, slowestThreadSize) {
			var fnName = funcNameExtractor(CommandResults);

			if(!(oHashedItemsColl instanceof HashedItemsCollection)) {
				throw new Error('Expected HashedItemsCollection object, got:\n' + dumpObject(oHashedItemsColl));
			}

			var nowTS = now();

			// adjust the parameters - not every caller runs in multi-threading and have this information
			tsStart               = tsStart || nowTS;
			tsFinish              = tsFinish || nowTS;
			slowestThreadDuration = slowestThreadDuration || 0;
			slowestThreadSize     = slowestThreadSize || 0;

			// adjust these before calling the success, skipped & error
			if (rootPath)  oHashedItemsColl.adjustRelativePaths(rootPath);
			if (algorithm) oHashedItemsColl.setAlgorithmForAll(algorithm);
			var oSuccess = oHashedItemsColl.getSuccessItems(),
				oSkipped = oHashedItemsColl.getSkippedItems(),
				oError   = oHashedItemsColl.getErrorItems();

			// the reason why we are using _ in the attribute names is
			// so that we can replace them with space in text outputs
			this.Generated_By                   = sprintf('Checksums generated by %s v%s -- %s', Global.SCRIPT_NAME, Global.SCRIPT_VERSION, Global.SCRIPT_URL);
			this.Root_Path                      = rootPath;
			this.Algorithm                      = algorithm || CURRENT_ALGORITHM;
			this.Snapshot_DateTime_Compact      = nowTS.formatAsDateTimeCompact();


			// these calculations are not as time-consuming as you might think
			// but the extra info may not be for everyone's taste
			var oEarliestItem   = oHashedItemsColl.getEarliestItem(),
				oLatestItem     = oHashedItemsColl.getLatestItem(),
				oSmallestItem   = oHashedItemsColl.getSmallestItem(),
				oLargestItem    = oHashedItemsColl.getLargestItem(),
				oMinElapsedItem = oHashedItemsColl.getMinElapsedItem(),
				oMaxElapsedItem = oHashedItemsColl.getMaxElapsedItem();

			this.ExtInfo = {
				Snapshot_DateTime_Timestamp     : nowTS,
				Snapshot_DateTime_DOpus         : nowTS.formatAsDateDOpus(),
				Snapshot_DateTime_ISO           : nowTS.formatAsDateISO(),
				Snapshot_DateTime_String        : new Date(nowTS).toString(),
				Snapshot_DateTime_UTC           : new Date(nowTS).toUTCString(),
				Snapshot_DateTime_Locale        : new Date(nowTS).toLocaleString(),

				Total_Size                      : oHashedItemsColl.sizeTotal + ' B (' + oHashedItemsColl.sizeTotal.formatAsSize() + ')',
				Total_Count                     : oHashedItemsColl.countTotal,
				Valid_Size                      : oHashedItemsColl.sizeSuccess + ' B (' + oHashedItemsColl.sizeSuccess.formatAsSize() + ')',
				Valid_Count                     : oHashedItemsColl.countSuccess,
				Skipped_Size                    : oHashedItemsColl.sizeSkipped + ' B (' + oHashedItemsColl.sizeSkipped.formatAsSize() + ')',
				Skipped_Count                   : oHashedItemsColl.countSkipped,
				Invalid_Size                    : oHashedItemsColl.sizeError + ' B (' + oHashedItemsColl.sizeError.formatAsSize() + ')',
				Invalid_Count                   : oHashedItemsColl.countError,

				Slowest_Thread_Duration         : slowestThreadDuration + ' ms (' + slowestThreadDuration.formatAsDuration() + ' s)',
				Slowest_Thread_Size             : slowestThreadSize + ' B (' + slowestThreadSize.formatAsSize() + ')',

				Start_Time_Timestamp            : tsStart,
				Start_Time                      : tsStart.formatAsHms(),
				Finish_Time_Timestamp           : tsFinish,
				Finish_Time                     : tsFinish.formatAsHms(),
				Elapsed_Time_Timestamp          : (tsFinish - tsStart),
				Elapsed_Time                    : (tsFinish - tsStart) + ' ms (' + (tsFinish - tsStart).formatAsDuration() + ' s)',
				Average_Speed_Success_Only      : ( (oHashedItemsColl.sizeSuccess * 1000 / (tsFinish - tsStart)) || 0 ).formatAsSize() + '/s', // we calculate speed per second

				Earliest_File_Name              : oEarliestItem.fullpath,
				Earliest_File_DateTime_Compact  : oEarliestItem.mod_date, // already formatte,
				Earliest_File_DateTime_Timestamp: oEarliestItem.mod_ts,
				Latest_File_Name                : oLatestItem.fullpath,
				Latest_File_DateTime_Compact    : oLatestItem.mod_date, // already formatte,
				Latest_File_DateTime_Timestamp  : oLatestItem.mod_ts,
				Smallest_File_Name              : oSmallestItem.fullpath,
				Smallest_File_Size              : oSmallestItem.size + ' B (' + oSmallestItem.size.formatAsSize() + ')',
				Largest_File_Name               : oLargestItem.fullpath,
				Largest_File_Size               : oLargestItem.size + ' B (' + oLargestItem.size.formatAsSize() + ')',

				Min_Elapsed_for_File_Name       : oMinElapsedItem.fullpath,
				Min_Elapsed_for_File_Size       : oMinElapsedItem.size + ' B (' + oMinElapsedItem.size.formatAsSize() + ')',
				Min_Elapsed_for_File_Duration   : oMinElapsedItem.elapsed + ' ms (' + oMinElapsedItem.elapsed.formatAsDuration() + ' s)',
				Max_Elapsed_for_File_Name       : oMaxElapsedItem.fullpath,
				Max_Elapsed_for_File_Size       : oMaxElapsedItem.size + ' B (' + oMaxElapsedItem.size.formatAsSize() + ')',
				Max_Elapsed_for_File_Duration   : oMaxElapsedItem.elapsed + ' ms (' + oMaxElapsedItem.elapsed.formatAsDuration() + ' s)'
			}

			// remove some internal fields
			for (var ohi in oSuccess) {
				if (!oSuccess.hasOwnProperty(ohi)) continue; // skip prototype functions, etc.
				var oHashedItem = oSuccess[ohi];
				delete oHashedItem.error;     // this will be falsy for all success items
				delete oHashedItem.skipped;   // this will be falsy for all success items
				delete oHashedItem.finished;  // this may or may not be falsy for success items - TODO review!
				delete oHashedItem.algorithm; // this is already in the header, I do not support multiple algorithms in one go yet
				if (!EXPORT_EXTENDED_DATA) {
					delete oHashedItem.fullpath;
					delete oHashedItem.size;
					delete oHashedItem.mod_ts;
					delete oHashedItem.mod_date;
				}
			}
			// add the Success, Skipped, Error items
			this.items                 = oSuccess;
			if (oSkipped) this.skipped = oSkipped;
			if (oError)   this.error   = oError;
		}
		/**
		 * Creates DOpus-only summary texts for popups and/or Output window.
		 *
		 * @param {string} fnCallerName caller function's name
		 * @param {boolean} isAborted has user aborted the operation
		 * @param {boolean=} dumpItemResults if individual results should be dumped to DOpus Output
		 * @returns {{successSummary: string, errorsSummary: string}}
		 */
		CommandResults.prototype.getSummaries = function (fnCallerName, isAborted, dumpItemResults) {
			var successSummary = '', errorsSummary = '';

			successSummary = sprintf(
				'\n====  %s SUMMARY  ====\n'
				+ '%s\n' // show errors only if necessary
				+ '%s' // show aborted only if necessary
				+ 'Start: %s\nFinish: %s\n'
				+ 'Errors: %d\n'
				+ 'Slowest Thread Duration: %s\nSlowest Thread Size: %s\n'
				+ 'Slowest File Name: %s\nSlowest File Size: %s\nSlowest File Duration: %s\n'
				+ '\n\n'
				+ 'Total Files after Filtering: %d\n\n'
				+ 'Total Size after Filtering: %s\n\n'
				+ 'Total Elapsed: %s\n\n'
				+ 'Average Speed: %s',
				fnCallerName,
				(this.ExtInfo.Invalid_Count ? '\nSOME ERRORS OCCURRED\n' : ''),
				isAborted ? '\nUSER ABORTED!\n\n' : '',

				this.ExtInfo.Start_Time,
				this.ExtInfo.Finish_Time,

				this.ExtInfo.Invalid_Count,

				this.ExtInfo.Slowest_Thread_Duration,
				this.ExtInfo.Slowest_Thread_Size,

				this.ExtInfo.Max_Elapsed_for_File_Name,
				this.ExtInfo.Max_Elapsed_for_File_Size,
				this.ExtInfo.Max_Elapsed_for_File_Duration,

				this.ExtInfo.Valid_Count,
				this.ExtInfo.Valid_Size,
				this.ExtInfo.Elapsed_Time,
				this.ExtInfo.Average_Speed_Success_Only
			);

			var aErrorFiles = getObjKeys(this.error);
			if (aErrorFiles.length) {
				errorsSummary = '\nFiles with errors:\n';
				for (var i = 0; i < aErrorFiles.length; i++) {
					errorsSummary += '\t' + aErrorFiles[i] + '\n';
				}
				errorsSummary += '\n\n';
			}

			if (dumpItemResults) {
				for (var f in this.items) {
					if (!this.items.hasOwnProperty(f)) continue;
					var el = this.items[f];
					var itemSummaryMsg = sprintf(
						'%s -- Worker finished: %b, size: %15d, elapsed: %8d ms, file: %s -- %s',
						fnCallerName,
						el.finished,
						el.size,
						el.elapsed,
						el.fullpath,
						el.hash ? 'Result: ' + el.hash : 'Error: ' + el.error
					);
					logger.normal(itemSummaryMsg);
				}
				logger.normal('');
				logger.normal('');
				logger.normal('');
				logger.normal('');
				logger.normal('');
			}
			return { successSummary: successSummary, errorsSummary: errorsSummary||'' };
		}
	}


	// Knapsack & KnapsacksCollection
	{
		/**
		 * @param {string} id any unique id, e.g. a thread ID
		 * @constructor
		 * @see getNewThreadID()
		 */
		function Knapsack(id) {
			/**
			 * should be a threadID
			 */
			this.id        = id || getNewThreadID();
			/**
			 * number of items in this knapsack
			 */
			this.count     = 0;
			/**
			 * total number of bytes in this knapsack
			 */
			this.size      = 0;
			this.itemsColl = new HashedItemsCollection();
			this.finished  = false;
		}
		/**
		 * @param {HashedItem} oHashedItem
		 */
		Knapsack.prototype.addItem = function (oHashedItem) {
			this.itemsColl.addItem(oHashedItem);
			this.size += oHashedItem.size;
			this.count++;
		}
		/**
		 * @param {HashedItem} oHashedItem
		 */
		Knapsack.prototype.delItem = function (oHashedItem) {
			this.size -= oHashedItem.size;
			this.count--;
			this.itemsColl.delItem(oHashedItem);
		}
		/**
		 * @returns {boolean} true if all subitems in this knapsack are finished, must be marked by the items
		 * @see HashedItem
		 */
		Knapsack.prototype.isFinished = function () {
			if (this.finished) return true;

			// not marked as finished yet, check all subitems
			var oItems = this.itemsColl.getItems();
			for (var k in oItems) {
				if (!oItems.hasOwnProperty(k)) continue; // skip prototype functions, etc.
				if (!oItems[k].finished) return false;
			}
			// all items report back as finished
			this.finished = true;
		}


		/**
		 * @param {string} id any unique id, e.g. timestamp
		 * @constructor
		 * @see now()
		 */
		function KnapsacksCollection(id){
			this.id              = id || now();

			/** @type {Object.<string, Knapsack>} */
			this._myItems        = {};
			/** @type {Object.<string, Knapsack>} */
			this.finishedKS      = {};
			/** @type {Object.<string, Knapsack>} */
			this.unfinishedKS    = {};

			this.sizeTotal       = 0;
			this.sizeFinished    = 0;
			this.sizeUnfinished  = 0;

			this.countTotal      = 0;
			this.countFinished   = 0;
			this.countUnfinished = 0;
		}
		/**
		 * @param {Knapsack} oKnapsack
		 */
		KnapsacksCollection.prototype.addKnapsack = function (oKnapsack) {
			if (!(oKnapsack instanceof Knapsack)) {
				throw new Error('Expected Knapsack object, got:\n' + dumpObject(oKnapsack));
			}
			if (this._myItems[oKnapsack.id]) {
				throw new Error('Knapsack cannot be added, already in collection:\n' + oKnapsack.id);
			}
			this._myItems[oKnapsack.id] = oKnapsack;
			this.sizeTotal  += oKnapsack.size;
			this.countTotal += oKnapsack.count;

			this.unfinishedKS[oKnapsack.id] = oKnapsack;
			this.sizeUnfinished  += oKnapsack.size;
			this.countUnfinished += oKnapsack.count;
		}

		/**
		 * @returns {boolean} true if all knapsacks finished, must be marked by the knapsack
		 * @see Knapsack
		 */
		KnapsacksCollection.prototype.allFinished = function () {
			var fnName = 'KnapsacksCollection.allFinished';
			if (this.countUnfinished < 0) {
				abortWithFatalError(fnName + '():\nThis should never have happened, item count is negative: ' + this.countUnfinished);
			}
			if (this.countUnfinished === 0) return true;

			// not marked as finished yet, check all subitems again
			// for (var ks in this._myItems) {
			// 	if (!this._myItems.hasOwnProperty(ks)) continue; // skip prototype functions, etc.
			// 	var oKnapsack = this._myItems[ks];
			for (var ks in this.unfinishedKS) {
				if (!this.unfinishedKS.hasOwnProperty(ks)) continue; // skip prototype functions, etc.
				var oKnapsack = this.unfinishedKS[ks];

				if (oKnapsack.isFinished()) {
					// move knapsack from unfinished to finished and update stats
					this.finishedKS[ oKnapsack.id ] = oKnapsack;
					// logger.snormal('%s -- KS %s finished - BEFORE this.countFinished: %d, this.countUnfinished: %d', fnName, oKnapsack.id, this.countFinished, this.countUnfinished);
					this.sizeFinished   += oKnapsack.size; this.countFinished   += oKnapsack.count;
					this.sizeUnfinished -= oKnapsack.size; this.countUnfinished -= oKnapsack.count;
					// logger.snormal('%s -- KS %s finished - AFTER  this.countFinished: %d, this.countUnfinished: %d', fnName, oKnapsack.id, this.countFinished, this.countUnfinished);
					delete this.unfinishedKS[ oKnapsack.id ];
				}
			}
			return this.countUnfinished === 0;
		}

		/**
		 * converts KnapsacksCollection to CommandResults
		 * @param {string} rootPath current path
		 * @param {string} algorithm hashing algorithm
		 * @param {object} tp Thread Pool object from cache
		 * @param {number} tsStart start timestamp
		 * @param {number} tsFinish finish timestamp
		 */
		KnapsacksCollection.prototype.getAsCommandResults = function (rootPath, algorithm, tp, tsStart, tsFinish) {
			var fnName = 'getAsCommandResults';

			var oHashedItemsColl  = new HashedItemsCollection(),
				slowestKSDuration = 0,
				slowestKSSize     = 0;

			// a threadID points to 1 knapsack
			var oFinishedKS = this.finishedKS;
			knapsacks: for (var kskey in oFinishedKS) {
				if (!oFinishedKS.hasOwnProperty(kskey)) continue; // skip prototype functions, etc.
				var ksCurrent = oFinishedKS[kskey],
					ksMap     = tp(ksCurrent.id);

				// each knapsack contains a DOpus Map of files, which are also DOpus Maps themselves
				var elapsedForThisKS = 0;
				files: for (var eKS = new Enumerator(ksMap); !eKS.atEnd(); eKS.moveNext()) {
					var fileFullpath = eKS.item(),
						fileAttribs  = ksMap(fileFullpath);

					// get results from fileAttribs (DOpus Map)
					var oHashedItem = new HashedItem(doh.getItem(fileFullpath), null, fileAttribs('result'), algorithm, fileAttribs('error'), null);
					oHashedItem.elapsed = fileAttribs('elapsed');
					oHashedItemsColl.addItem(oHashedItem);

					elapsedForThisKS += fileAttribs('elapsed');
				}
				// check if we have the slowest KS
				if (elapsedForThisKS >= slowestKSDuration) {
					slowestKSDuration = elapsedForThisKS;
					slowestKSSize     = ksCurrent.size;
				}
			}
			return new CommandResults(oHashedItemsColl, rootPath, algorithm, tsStart, tsFinish, slowestKSDuration, slowestKSSize);
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

	// not the most elegant solution, but JScript/JS does not easily allow to determine function name from a given function object
	// cannot parse 'anonymous' methods, incl. exposed method names in singletons, e.g. funcNameExtractor(actions.getFunc)
	var reFuncNameExtractor = new RegExp(/^function\s+(\w+)\(.+/);
	function funcNameExtractor(fnFunc) {
		var fnName = 'funcNameExtractor';
		if (typeof fnFunc !== 'function') {
			abortWithFatalError(sprintf('%s -- Given parameter is not a recognized function\n%s', fnName, dumpObject(fnFunc)));
		}
		var _matches = fnFunc.toString().match(reFuncNameExtractor);

		return _matches ? _matches[1] : 'Anonymous -- ' + dumpObject(fnFunc, true).value.replace(/\n|^\s+|\s+$/mg, '');
	};

	// poor man's debugger
	/**
	 * returns the given object in a printable fashion, incl. some of DOpus objects
	 * @param {any} obj any object, tries to find out the type automatically
	 * @param {boolean=} asPOJO if the output object should be returned as POJO or string
	 * @returns {object|string}
	 */
	function dumpObject(obj, asPOJO) {
		asPOJO = asPOJO || false;
		var out = {};
		out.type      = typeof obj;
		// out.prototype = obj.prototype;
		out.value     = '';
		switch(typeof obj) {
			case 'string':
			case 'number':
			case 'boolean':
			case 'bigint':
				out.value = obj; break;
			case 'undefined':
				out.value = 'undefined'; break;
			case 'function':
				out.value = obj.toString().slice(0, 100) + ' ...cropped for brevity'; break;
				// out.value = obj.toString(); break;
			case 'object':
				if (obj === null) { out.value = 'null'; break; }
				try {
						 if (doh.isValidDOItem(obj))        { out.value = 'DOpus Item - fullpath: ' + obj.realpath; break; }
					else if (doh.isValidDOCommandData(obj)) { out.value = 'DOpus Command Data'; break; }
					else if (doh.isValidDOColumnData(obj))  { out.value = 'DOpus Column Data'; break; }
					else if (doh.isValidDOMap(obj))         { out.value = 'DOpus Map'; break; }
					else if (doh.isValidDOVector(obj))      { out.value = 'DOpus Vector'; break; }
					else if (doh.isValidDOEnumerable(obj))  { out.value = 'DOpus Enumerable'; break; }
				} catch (e) {}
				try { JSON.parse(JSON.stringify(obj, null, 4)); out.value = obj; break; } catch(e) {}

				try { out.value = obj.toString(); return out.value; } catch (e) {}
				try { out.value = new RegExp(obj); return out.value; } catch (e) {}
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

	function __LIBS__(){ 0 }
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
						var number = parseInt(value, 10);
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
								var sf2 = (number ? sf.replace(/^0+/, '') : sf).length;
								precision = precision ? Math.min(precision, sf2) : precision;
								method = (!precision || precision <= sf2) ? 'toPrecision' : 'toExponential';
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

	function __TODO__(){ 0 }
	// TODO
	{
		/*
			+ review startTS, stopTS... etc. and replace with stopwatch?
			+ review ReadADS, SaveADS, DeleteADS outputs
			+ IMPORT: if 1 file is selected, try to use it?
			+ simplify applyFilterToSelectedItems()
			+ fix largest/smallest/earliest/latest stats
			  	SAME: Fix HashedItemsCollection.getEarliestItem, HashedItemsCollection.getLatestItem, HashedItemsCollection.getSmallestItem, HashedItemsCollection.getLargestItem
			+ Migrate all of {results|false} stuff to Result object except File Access methods
			+ turn cache access to a CacheMgr singleton
			+ review ReadADS, SaveADS, DeleteADS outputs - 2nd pass
			+ Auto Drive Type detection and reducing the number of threads to avoid disk-thrashing when using HDDs
			+ EXPORT: implement on-the-fly calculation and direct export
			+ IMPROVE: when using the OSP version, extract the included .wav files to a subdir
			+ CODING: remove timeout & maxwait stuff, unnecessary
			+ CODING: Consolidate MTActionResults & CommandResults!
			+ CODING: Convert buildSummaryAndErrorTexts() & MTActionResults/MTActionResultFile to TYPEDEFs?
			  done via CommandResults.getSummaries() instead

			- BUG: IMPORT- better format detection in fileExchangeHandler.prepareForImport()?
			- BUG: If multiple files are selected (some missing ADS) and ADS delete is performed, it says "some files are skipped"
			- BUG: Auto-refresh when Smart Update or Delete ADS is performed (copy logic from MExt)
			- BUG: Fix random bug with ADS.Read when we get a file which has been already deleted, e.g. when the temp dir is displayed
			- BUG: Fix the annoying window flash when adding files to a collection
			- IMPROVE: review progress bar and switch to 'full' - 1 bar for files, 1 bar for bytes
			- IMPROVE: Improve FileFormat & FileName dependency and detection
			- IMPROVE: Improve error handling when files are marked as read-only
			- IMPROVE: Implement blake3 & rhash hashing
			- IMPROVE: Configuration variables - BIG TASK!
			- IMPROVE: Implement external JSON file to customize columns
			- IMPROVE: Implement Disk Serial number detection and re-recognizing them fast!
			- IMPROVE: Error messages & optics of the messages
			- IMPROVE: What to do when all feedback options are disabled: Success & Error Messages, etc. => Sound Files


			- CODING: convert progress bar methods to its own object
			- CODING: review logger levels for all outputs
			- CODING: review all @ts-ignore - especially DOpus map access stuff - convert cache to singleton if ncessary
			- CODING: updateProgressBar() - review parameters list, it's too long


			- MAYBE: IMPORT: automatic path adjustment in fileExchangeHandler.convertForImportFromJSON(),
			  	i.e. if full paths are stored in the file but the current does not match the rootpath stored in the JSON file
			  	we migth use the full path and ignore the relative paths
			  	ADVANTAGE: one can put the JSON file anywhere and import it
			  	DISADVANTAGE: I'm not sure if it wouldn't be too confusing or error-prone?



			METHODS WHICH REQUIRE CUSTOM OBJECT REFACTORING:
			+ knapsackItems()
			+ applyFilterToSelectedItems()
			+ ADS.read()
			+ ADS.save()
			+ ADS.remove()
			+ addFilesToCollection() ?
			+ _getHashesOfAllSelectedFiles()
			+ _getHashesOfAllSelectedFiles --> abortWithFatalError('Cannot read stream data for: ' + oHashedItem.path);
			  SAME: fix UNDEFINED error for COPY_TO_CLIPBOARD when unhashed files are selected
			+ buildActionResultsObject() - replaced by MTActionResults
			+ fileExchangeHandler.prepareForExport()
			+ fileExchangeHandler.convertForExportToSHA1()
			+ fileExchangeHandler.prepareForImport()
			+ fileExchangeHandler.convertForImportFromSHA1()
			+ fileExchangeHandler.convertForImportFromJSON()


			how to enumerate NTFS streams?
			from https://microsoft.public.scripting.vbscript.narkive.com/xGdxzTQu/using-user32-dll-function-from-vbscript-wsh
			DO NOT RUN THIS!!!!!!
				WshShell.Run "%windir%\System32\RUNDLL32.EXE USER32.DLL,UpdatePerUserSystemParameters", 1, False
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



/*
	8888888b.  8888888888        d8888 8888888b.  888b     d888 8888888888     888b     d888 8888888b.
	888   Y88b 888              d88888 888  "Y88b 8888b   d8888 888            8888b   d8888 888  "Y88b
	888    888 888             d88P888 888    888 88888b.d88888 888            88888b.d88888 888    888
	888   d88P 8888888        d88P 888 888    888 888Y88888P888 8888888        888Y88888P888 888    888
	8888888P"  888           d88P  888 888    888 888 Y888P 888 888            888 Y888P 888 888    888
	888 T88b   888          d88P   888 888    888 888  Y8P  888 888            888  Y8P  888 888    888
	888  T88b  888         d8888888888 888  .d88P 888   "   888 888        d8b 888   "   888 888  .d88P
	888   T88b 8888888888 d88P     888 8888888P"  888       888 8888888888 Y8P 888       888 8888888P"
*/
{

	function __README_MD__(){ 0 }
	{
		/*


			# Cü's MultiThreadHash
			CuMTH or simply MTH is a user script for multi-threaded hashing for the brilliant, very powerful file manager [Directory Opus](https://gpsoft.com.au/) (often called DOpus or DO from here on), using its builtin hashing methods &amp; NTFS ADS.




			## FEATURES:

			* **Multi-threaded hashing**, defaults to all available cores on your machine.
			* **Seamless integration into DOpus**:
			* Any number of files and folders can be selected and then hashed, verified, exported, etc.
			* File modification date is kept as before when you add/remove ADS data.
			* Action results, e.g. verification errors, files with missing or dirty (outdated) ADS, etc. are put into separate collections for further review.
			* Caching of ADS data in memory.
			* Progress bar with Pause & Abort support.
			* 15 pre-created buttons with multiple examples and nice-looking icons.
			* 5 helper columns/script fields: *Available*, *Dirty* (showing what has changed: date and/or size), *Dirty* (simple), *Formatted ADS* data to use in Infotips, *Raw ADS* data.
			* Unicode characters are not corrupted when exported from or imported into ADS.
			* Configurable number of threads and maximum wait time.
			* Auto-detection of checksum files if only 1 file is selected and one of the import/verify buttons is used.
			* NTFS **ADS integration**, through and through.
			* **External checksum files support** for .md5 & .sha1, incl. on-the-fly export & verification without using ADS. Another JSON-based, specific to this script is also supported, which contains very detailed information.
			* **Long filename & path support** (> 255 chars).
			* Simple CPU **benchmarking**.
			* **Automatic HDD drive detection** (vs SSD, NVMe...) - CuMTH can reduce number of threads to avoid disk thrashing.
			* **Extremely fast**, in fact faster than most native hashing programs, even all of the few multi-threaded programs except one [*]. Although this JScript, the heavy work is done by DOpus, this script simply optimizes how it is done.
			* **Less CPU usage** than single- or multi-threaded programs.
			* Is not limited to the (currently 7) hashing algorithms supported by DOpus. **Extensible via external CLI hashing programs**, e.g. fsum, rhash, fastsum, fciv, blake3, etc. I included a few as example, incl. blake3, rhash.
			* **Detailed file information** in exported checksum files, e.g. number of total, successful, skipped or failed files and their sizes, earliest/latest file dates, smallest/largest files, snapshot date&time in multiple formats. Exported filenames can be generated with the latest file's timestamp. These can be suppressed but are computed anyway.



			[*] [CHK by Ilya Muravyov](http://compressme.net/) is a real piece of art when it comes to speed. It is the fastest hasher out there, bar none. Beats this script from 10% up to 40%, and other programs by at least 300, 400%. Excellent, excellent job Ilya! ...But unfortunately its speed advantage is overshadowed by its very spartan UI and usability. It is not automation-capable, e.g. with CLI parameters. It's not even possible to abort an operation. And good luck with re-verifying your files with the checksum files you just created. Yes, it can hash a directory but not verify it again (tested with latest v3.21). If you're fine with its UI and care only for the highest hashing speed possible, use CHK instead.

			Speed-wise other multi-threaded programs like [ExactFile/exf](https://www.exactfile.com/), let alone single-threaded programs are nowhere near of CuMTH. With many CPU cores and fast SSD/NVMe, you can easily reach hashing-speeds upwards of 1.5 GB/sec; on a RAMDisk I achieved 4.8 GB/sec under near-perfect conditions. You can test the capabilities of your CPU using the incl. benchmark command.



			## Why is SHA1 the default?

			**The goal is file integrity check, first and foremost.**

			Currently there will be only 1 algorithm: SHA1. DOpus' internal "sha256" & "sha512" seem to have [a bug and both calculate wrong results for files >=512 MB](https://resource.dopus.com/t/column-sha-256-and-sha-512/33525/6), that leaves: "md5", "sha1", "crc32", "crc32_php", and "crc32_php_rev" and I decided to go with SHA1 as a compromise *temporarily* because it's very fast & reasonably secure, between fast and insecure MD5 and slow and secure SHA256/SHA512.

			Before you start "*but SHA1 is broken...*" No, it is not broken, at least not for any practical purpose or for purposes of this script. Yes, SHA1 is known to have collisions but an attack requires malicious & very time-consuming preparation of tampered data, which is never ever the case for files on your disk, even 1 bit corruption in a file will result in a different hash even if you use MD5.

			The goal here is to quickly verify file integrity of your own files, not build military grade infrastructure or use these algorithms for web site security, etc. If you are concerned that the files under your control might be tampered with by external agents and could have the same hash checksum as previously, then this script is not what you're looking for.

			As soon as DOpus fixes the bug mentioned above, you can anyway switch to SHA-256/512 if you like.



			## Why ADS? Why not classical checksum files?

			*Short answer: Because they're static, become quickly obsolete and have a large overhead.*

			When you create hash checksum files of large folders with typical programs these files contain all the files, just as you requested, and their hashes. These files act as a snapshot. If you are not planning to make any changes in this folder, you can use the checksum file over and over. You can still use this script, as it includes full support for external checksum files and more, too.

			However, if or when you add or remove files from these folders, these files slowly become obsolete and deviate from the checksum you have created. If you use the old checksum file over and over, you will get increasing number of errors. If you create a new checksum file after each change in the folder, you will lose track of which files might have been corrupted.

			You might think "But why would I want to add/remove files from a secure 'archive' directory?" Say, you have a partition or an external disk where you keep copies of your projects, pictures, install files, whatever. If you're planning to use a single checksum file in the root folder or put a separate checksum file in each folder, be my guest.

			If you use ADS, however, you can **attach the hash checksum to each file**; the overhead is very small, only ~150 bytes per file. **The stored information is file's last known modification date & size and its hash value.** Different algorithms are kept separate from each other via ADS name, e.g. SHA1 in <filename>:MTH_SHA1,  MD5 in <filename>:MTH_MD5 and so on. Some programs try to achieve this putting hashes into the filenames, but that's a crude & ugly method. With ADS you can quickly identify changed files and still validate the unchanged files, since each hash is directly attached to the file and contains its size and date at the time of hashing, instead of in static snapshots. And you can select and verify any number of files, you do not need a checksum file containing each of these files. **That's where the real power of this script and integration into a file manager starts to shine.** Where's the catch? ADS work only in NTFS. If you are still not convinced, you can always use checksum files; in fact, once you have the hashes in ADS, you can export a checksum file in almost zero time to a checksum file, too.

			Another benefit is, the file's last modification timestamp & last known size is stored in ADS at the time of hashing. This helps to quickly identify changed files, since you have last updated the ADS hashes WITHOUT re-checking every single file, simply activate one of 'Dirty' or 'Dirty Verbose' columns and you will see. If the file size or date changes, it is almost impossible that the hash will not change unless some super genius agent manipulates your files and/or manipulates the ADS as well. So these files can be quickly identified in isolation, incl. what is changed: date, size or both. If you export ADS hashes, the script will warn you automatically that some files have no or outdates hashes.

			You can also import existing .sha1, .md5 or this script's own .json format checksum files into ADS and remove the dependency to external files. The imported checksums will not be verified during import, but you can verify them very easily and compare freshly calculated data vs the data you just imported.

			Yet another benefit is, apart from the extraordinarily fast multi-threading (fast af, if I may say so), if you are often synchronizing large amounts of files between computers, you can easily export the existing ADS data without re-calculation, and easily verify on the other computer, with this script or any other typical checksum programs, .md5 and .sha1 formats are fully supported. Verifying the hashes on the target machine will be usually much faster than binary comparison over network.

			Although currently **only 1 single algorithm at a time** is supported in the script (I see no benefit in using multiple), the ADS streams for multiple streams are completely independent of each other, i.e. SHA1 hashes are stored in a different stream than SHA256, MD5, etc. hashes. Use whichever algorithm suits your needs best. I might implement multiple algorithms if enough interest is there.

			**Bottom line is:**
			Once you get used to the integration of extremely fast hashing and an excellent file manager, you will not miss classical hashing programs ;)

			### ADS Overhead:

			For SHA1 hashes the amount of data is typically around 150-160 bytes. This information is NOT allocated in a separate cluster than the main file's own, i.e. if your cluster size is 4096 bytes, a 1 byte file plus 160 bytes ADS will still allocate only 4096 bytes, not 8192.

			### Recommended:

			- Generated files are UTF8 without BOM by default
			If you use DOpus text viewer plugin, activate '***Assume UTF-8 without BOM***' in its settings to view non-ASCII chars correctly.
			- Activating the DOpus option '***File Operations -> Copy Attributes -> Copy all NTFS data streams***' is highly recommended.
			- If you are using WinRAR you can activate '***Advanced -> Save file streams***' in archiving dialog and save it in your default profile as well. This will carry ADS hashes around.
			Unfortunately 7-Zip or DOpus created archives do NOT support this.
			- DO NOT USE EXACTFILE, EVER!
			To my **absolute HORROR** I found out that ExactFile occasionally computes hashes incorrectly (tested with SHA1 only), because I was using it a lot. it does so only sporadically, which makes the situation even worse imo. When ExactFile hashes completely identical files in multi-threading the generated checksum file states: this 1 file has a different hash than the others, and when you repeat the hashing it shows the computes the correct hash again.
			Completely unacceptable!



			## Design Principles of This Script

			- Wherever relevant, file size is preferred over file count.
			- Original files are never ever touched, only its ADS streams.
			- Tries to replace existing hashing programs, by integrating the functionality into a full-fledged file manager but it can easily be extended with external apps to utilize non-DOpus hashing algorithms, too
			- Speed! Speed! Speed! Tries to maximize of CPU usage if possible, not to let it sit idly.
			- Prefers NTFS ADS over external filelists with hashes, but external checksum files are fully supported as well.


			When you look at the code, you will see some non-typical, i.e. not state-of-the-art JavaScript. This has 2 reasons:
			1. I'm an ok but not the most seasoned JS programmer, JS is not my primary language.
			2. This not ES5 or newer, but JScript, which roughly [corresponds to JS 1.5/ES3](https://johnresig.com/blog/versions-of-javascript/)!
			3. This is not a browser environment and due to only available method to us for multi-threading,
			i.e. fire-and-forget, we cannot pass callback functions, etc. and must communicate via
			DOpus variables only.
			4. Debugging of user scripts without an IDE or browser support is a major PITA. DOpus developers probably never had such large scripts in mind when they introduced user scripts, so I cannot blame them at all.



			## Screenshots

			Buttons

			![./Screenshots/01.png](./Screenshots/01.png)



			Benchmark results on an AMD 3900x (12 cores, 24 threads

			![./Screenshots/02.png](./Screenshots/02.png)

			Hashing Progress

			![./Screenshots/03.png](./Screenshots/03.png)

			Summary

			![./Screenshots/04.png](./Screenshots/04.png)

			...more to come

		*/
	}

}



/*
	8888888b.  8888888888  .d8888b.   .d88888b.  888     888 8888888b.   .d8888b.  8888888888  .d8888b.
	888   Y88b 888        d88P  Y88b d88P" "Y88b 888     888 888   Y88b d88P  Y88b 888        d88P  Y88b
	888    888 888        Y88b.      888     888 888     888 888    888 888    888 888        Y88b.
	888   d88P 8888888     "Y888b.   888     888 888     888 888   d88P 888        8888888     "Y888b.
	8888888P"  888            "Y88b. 888     888 888     888 8888888P"  888        888            "Y88b.
	888 T88b   888              "888 888     888 888     888 888 T88b   888    888 888              "888
	888  T88b  888        Y88b  d88P Y88b. .d88P Y88b. .d88P 888  T88b  Y88b  d88P 888        Y88b  d88P
	888   T88b 8888888888  "Y8888P"   "Y88888P"   "Y88888P"  888   T88b  "Y8888P"  8888888888  "Y8888P"
*/
{
	function __RESOURCES__(){ 0 }

	String.prototype.substituteVars = function () {
		return this.replace(/\${([^}]+)}/g, function (match, p1) {
			return typeof eval(p1) !== 'undefined'
				? eval(p1)
				: 'undefined'
				;
		});
	};

	var SCRIPT_RESOURCES = {
		SummaryDialog: function(){/*
			<resources>
				<resource name="SummaryDialog" type="dialog">
					<dialog fontsize="8" height="290" lang="english" resize="yes" standard_buttons="ok,cancel" title="MTH Operation Results" width="480">
						<control halign="left" height="10" name="lblOperation" title="Operation:" type="static" width="40" x="10" y="10" />
						<control halign="left" height="12" name="txtOperation" readonly="yes" type="edit" width="170" x="54" y="8" />
						<control halign="left" height="10" name="lblStart" title="Start:" type="static" width="40" x="10" y="32" />
						<control halign="left" height="12" name="txtStart" readonly="yes" type="edit" width="50" x="54" y="30" />
						<control halign="left" height="10" name="lblFinish" title="Finish:" type="static" width="40" x="10" y="48" />
						<control halign="left" height="12" name="txtFinish" readonly="yes" type="edit" width="50" x="54" y="46" />
						<control halign="left" height="10" name="lblSuccess" title="Successful:" type="static" width="40" x="10" y="64" />
						<control halign="left" height="12" name="txtSuccess" readonly="yes" type="edit" width="50" x="54" y="62" />
						<control halign="left" height="10" name="lblErrors" title="Errors:" type="static" width="40" x="110" y="48" />
						<control halign="left" height="12" name="txtErrors" readonly="yes" type="edit" width="50" x="154" y="47" />
						<control halign="left" height="10" name="lblSkipped" title="Skipped:" type="static" width="40" x="110" y="64" />
						<control halign="left" height="12" name="txtSkipped" readonly="yes" type="edit" width="50" x="154" y="62" />
						<control halign="left" height="10" name="lblMaxElapsedPerThread" title="Max Elapsed/Thread:" type="static" width="72" x="212" y="32" />
						<control halign="left" height="12" name="txtMaxElapsedPerThreadSize" readonly="yes" type="edit" width="95" x="288" y="30" />
						<control halign="left" height="12" name="txtMaxElapsedPerThreadDuration" readonly="yes" type="edit" width="85" x="386" y="30" />
						<control halign="left" height="10" name="lblMaxElapsedPerFile" title="Max Elapsed/File:" type="static" width="72" x="212" y="50" />
						<control halign="left" height="12" name="txtMaxElapsedPerFileName" readonly="yes" type="edit" width="184" x="288" y="48" />
						<control halign="left" height="12" name="txtMaxElapsedPerFileSize" readonly="yes" type="edit" width="95" x="288" y="63" />
						<control halign="left" height="12" name="txtMaxElapsedPerFileDuration" readonly="yes" type="edit" width="85" x="386" y="63" />
						<control halign="left" height="10" name="lblTotalFilesAfterFiltering" title="Total Files After Filtering:" type="static" width="95" x="8" y="86" />
						<control halign="left" height="12" name="txtTotalFilesAfterFiltering" readonly="yes" type="edit" width="94" x="110" y="84" />
						<control halign="left" height="10" name="lblTotalSizeAfterFiltering" title="Total Size After Filtering:" type="static" width="95" x="8" y="102" />
						<control halign="left" height="12" name="txtTotalSizeAfterFiltering" readonly="yes" type="edit" width="94" x="110" y="99" />
						<control halign="left" height="10" name="lblTotalElapsed" title="Total Elapsed:" type="static" width="72" x="212" y="86" />
						<control halign="left" height="12" name="txtTotalElapsed" readonly="yes" type="edit" width="100" x="288" y="84" />
						<control halign="left" height="10" name="lblAverageSpeed" title="Average Speed:" type="static" width="72" x="212" y="100" />
						<control halign="left" height="12" name="txtAverageSpeed" readonly="yes" type="edit" width="100" x="288" y="99" />
						<control halign="left" height="10" name="lblResults" title="Results" type="static" width="40" x="8" y="120" />
						<control fullrow="yes" height="135" name="listResults" nosel="yes" resize="wh" type="listview" viewmode="details" width="462" x="8" y="132">
							<contents>
								<item text="foo" />
								<item text="test" />
								<item text="tes" />
							</contents>
							<columns>
								<item text="Name" />
								<item text="Status" />
								<item text="Message" />
								<item text="Path" />
							</columns>
						</control>
					</dialog>
				</resource>
			</resources>

			*/}
			.toString().substituteVars(),

		simple: function(){/*
			<resources>
				<resource name="dialog2" type="dialog">
					<dialog fontsize="8" height="100" lang="" width="180" />
				</resource>
			</resources>
		*/}.toString().substituteVars()

	}

	for (var sr in SCRIPT_RESOURCES) {
		SCRIPT_RESOURCES[sr] = SCRIPT_RESOURCES[sr].replace(/^\t+/mg, '').slice(14,-3).trim();
	}
}

