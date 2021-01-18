// GLOBAL OBJECTS
{
	/**
	 * DESIGN PRINCIPLES
	 *
	 * - wherever relevant, file size is preferred over file count
	 * - not a solution trying to mimic existing hashing programs
	 * - this script tries to maximize of CPU usage if possible, not to let it sit idly
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

	var Global = {};
	Global.SCRIPT_NAME        = 'CuMultiThreadHash'; // WARNING: if you change this after initial use you have to reconfigure your columns, infotips, rename scripts...
	Global.SCRIPT_NAME_SHORT  = 'MTH'; // WARNING: if you change this after initial use you have to rename all methods!
	Global.SCRIPT_VERSION     = 'v0.9';
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

	// do not change
	var GlobalScope = this;

	var sleepdur = 1; // in millisecs, used as wait between checking available # of threads & still running threads checks

	var STREAM_PREFIX     = 'MTHash_';

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
}



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

// called by custom DOpus command
function onDOpusMTHManagerStart(scriptCmdData) {
	var fnName  = 'OnMTHManagerStart'; // only for logger outputs, nothing else

	var tsStart = getTS();

	DOpus.ClearOutput();

	// VALIDATE PARAMETERS
	{
		// maxwait will not be needed for this script at all
		// but if I use this script for webpage fetch or alike it will come handy
		var param = {};


		// param.cmd      = scriptCmdData.func.args.COMMAND;         // DOpus command name (not the function name in this file)
		param.maxcount          = scriptCmdData.func.args.MAXCOUNT;           // maxiumum number of threads, default: all available
		param.maxwait           = scriptCmdData.func.args.MAXWAIT;            // maximum wait in millisecs for a thread to finish
		param.recurse           = scriptCmdData.func.args.RECURSE;            // true: if dirs are selected process files under them, false: skip dirs
		param.hard_update_ads   = scriptCmdData.func.args.got_arg.HARD_UPDATE_ADS;
		param.verify_from_ads   = scriptCmdData.func.args.got_arg.VERIFY_FROM_ADS;
		param.smart_update_ads  = scriptCmdData.func.args.got_arg.SMART_UPDATE_ADS;
		param.find_dirty        = scriptCmdData.func.args.got_arg.FIND_DIRTY;
		param.find_missing      = scriptCmdData.func.args.got_arg.FIND_MISSING;
		param.copy_to_clipboard = scriptCmdData.func.args.got_arg.COPY_TO_CLIPBOARD;
		param.export_to_file    = scriptCmdData.func.args.got_arg.EXPORT_TO_FILE;
		param.import_from_file  = scriptCmdData.func.args.got_arg.IMPORT_FROM_FILE;
		param.verify_from_file  = scriptCmdData.func.args.got_arg.VERIFY_FROM_FILE;
		// if (!param.cmd) {
		// 	logger.error(sprintf('%s -- Options are invalid: COMMAND empty', fnName));
		// 	return false;
		// }
		if (!param.recurse) {
			param.recurse = true;
		}
		if (!param.maxcount) {
			param.maxcount = MAX_AVAILABLE_CORE_COUNT;
		}
		if (!param.maxwait) {
			// if no max wait given use 1 hour in millisecs
			param.maxwait = 60*60*1000;
		}
		logger.force(sprintf('%s -- dirty: %s', fnName, param.find_dirty));

		if (!param.hard_update_ads && !param.verify_from_ads && !param.smart_update_ads &&
			!param.find_dirty && !param.find_missing &&
			!param.copy_to_clipboard && !param.export_to_file && !param.import_from_file && !param.verify_from_file) {
			logger.error(sprintf('%s -- No valid command is given invalid: %s', fnName, JSON.stringify(param, null, '\t')));
			return false;
		}

	}

	// runaway stoppers for while loops
	var itermax = Math.round(2 * param.maxwait / (sleepdur||1)), itercnt = 0;

	var userAborted = false;

	logger.verbose(sprintf('%s -- Operating parameters: %s', fnName, JSON.stringify(param, null, '\t')));


	switch(true) {
		case param.hard_update_ads:
			break;
		case param.verify_from_ads:
			break;
		case param.smart_update_ads:
			break;
		case param.find_dirty:
			break;
		case param.find_missing:
			break;
		case param.copy_to_clipboard:
			break;
		case param.export_to_file:
			break;
		case param.import_from_file:
			break;
		case param.verify_from_file:
			break;
	}




	// SPLITTING / KNAPSACKING
	{
		var ts1 = getTS();
		// var selectedKS = KnapsackSelectedItems(scriptCmdData.func.sourcetab.selected, fnSelectFilesWithoutHashes, true, param.maxcount, false);
		var selectedKS = KnapsackSelectedItems(scriptCmdData.func.sourcetab.selected, fnAcceptFilesIndiscriminately, true, param.maxcount, false);
		// logger.error(JSON.stringify(outObj['knapsacks'], null, 4));
		logger.normal();
		logger.normal(
			sprintf(
				'%s -- Selected - File Size: %d, File Count: %d, Knapsacks Count: %d, Knapsacking Duration: %d ms',
				fnName,
				selectedKS.totalsize,
				selectedKS.filescnt,
				selectedKS.knapsacks.length,
				getTS() - ts1
			)
		);
		for (var ki = 0; ki < selectedKS.knapsacks.length; ki++) {
			var ks = selectedKS.knapsacks[ki];
			// assign the knapsack a threadID
			// so that we can check poll the thread status and results below
			// this does not need to be assigned up here, I do it for logging purposes
			selectedKS.knapsacks[ki]['threadID'] = getThreadID();
			logger.normal(sprintf('%s -- Knapsack #%02d, thread ID: %s, stats - Length: %5d, Capacity: %10d', fnName, ki, ks['threadID'], ks['items'].length, ks['capacity']));
		}
		var selected_items_cnt = selectedKS['filescnt'];
		var selected_bytes_cnt = selectedKS['totalsize'];

		// nothing to do
		if (!selected_items_cnt) {
			logger.force(sprintf('%s -- Nothing to do, quitting...', fnName));
			return;
		}
	}




	return;





	// INITIALIZE PROGRESS BAR
	{
		if (USE_PROGRESS_BAR) {
			var progbar = scriptCmdData.Func.Command.progress;
			progbar.pause = true;
			progbar.abort = true;
			progbar.bytes = true;
			progbar.Init(scriptCmdData.func.sourcetab, ''); // window title
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
			var unitMax      = selected_bytes_cnt.getUnit();
			var formattedMax = selected_bytes_cnt.formatAsSize(unitMax);
		}
	}


	// INITIALIZE THREAD POOL
	util.sv.Set('TP') = DOpus.Create.Map();
	var tp = util.sv.Get('TP');


	// SEND SELECTED FILES TO WORKER THREADS
	{
		for (var ki = 0; ki < selectedKS.knapsacks.length; ki++) {
			var ks = selectedKS.knapsacks[ki];
			//logger.force(sprintf('%s -- Knapsack stats - Length: %5d, Capacity: %10d', fnName, ks['items'].length, ks['capacity']));

			// prepare the variables for this knapsack's worker
			var torun = sprintf('%s %s THREADID="%s" MAXWAIT=%s', util.dopusrt, WORKER_COMMAND, ks['threadID'], param.maxwait);

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
				new_file('finished')   = false;
				new_file('elapsed')    = 0;
				new_file('timeout')    = false;
				new_file('error')      = false;
				new_file('hash')       = false;
				new_file('finalized')  = false;

				filesMap(selitem['path']) = new_file;
			}
			// put this knapsack into thread pool
			tp(ks['threadID']) = filesMap;
			util.sv.Set('TP') = tp;
			logger.info(sprintf('%s -- Command to run: %s', fnName, torun));
			util.cmd.RunCommand(torun);
		}
	}


	// ALL THREADS STARTED - NOW MONITOR THEM
	{
		var all_finished = false, ts = getTS();
		var totalcnt = 0, totalbytes = 0;
		itercnt = 0;
		unfinished: while(!all_finished && ++itercnt < itermax && getTS() - ts < param.maxwait) {
			// logger.force(sprintf('%s -- itercnt: %d', fnName, itercnt));
			DOpus.Delay(sleepdur);

			all_finished = true;
			for (var ki = 0; ki < selectedKS.knapsacks.length; ki++) {
				var ks = selectedKS.knapsacks[ki];
				var threadID = selectedKS.knapsacks[ki]['threadID'];
				// logger.force(sprintf('%s -- KS Thread ID: %s', fnName, threadID));
				var ksMap = tp(threadID);

				knapsackiter: for (var e = new Enumerator(ksMap); !e.atEnd(); e.moveNext()) {
					var ksItemKey = e.item();         // full path is the key, as we put it in the manager
					var ksItemVal = ksMap(ksItemKey); // map with: maxwait, filename, filepath, filesize, finished, elapsed, timeout, error, hash
					// logger.force(sprintf('%s -- ksItemVal("filename"): %s, finished: %b', fnName, ksItemVal('filename'), ksItemVal('finished')));

					// check for any unfinished file
					if (!ksItemVal('finished')) {
						// file not finished yet
						all_finished = false;
						continue knapsackiter;
					} else if (ksItemVal('finalized')) {
						continue knapsackiter;
					} else {
						// file finished
						ksItemVal('finalized') = true;
						// UPDATE THE PROGRESS BAR
						{
							if (USE_PROGRESS_BAR) {
								// this is not accurate as you might expect
								// but given the circumstances and that this is an abuse of dopusrt, it's best we can do
								++totalcnt;
								totalbytes += ksItemVal('filesize');
								// logger.force(sprintf('%s -- totalbytes: %d, selected_bytes_cnt: %d', fnName, totalbytes, selected_bytes_cnt));

								progbar.SetName(ksItemVal('filename'));
								progbar.SetType('file');
								var percentage;
								var tsCurrent = getTS();
								var elapsed = tsCurrent - tsStart;
								var bytesPerSec = Math.round( totalbytes / (elapsed/1000) );
								var timeRemaining = elapsed < 3000 ? '...' : Math.round( (elapsed/1000) * ( (selected_bytes_cnt/totalbytes) - 1) );
								progbar.SetStatus(sprintf('Time Remaining (rough): %4ss, Average Speed: %7s/s', timeRemaining, bytesPerSec.formatAsSize()));
								percentage = Math.floor(100 * totalbytes / selected_bytes_cnt);
								progbar.SetBytesProgress(percentage);
								var formattedCurrent = totalbytes.formatAsSize(unitMax);
								progbar.SetTitle(sprintf('%2d% - %s/%s', percentage, formattedCurrent, formattedMax));
								switch (progbar.GetAbortState()) {
									case 'a': userAborted = true; break unfinished;
									case 'p':
										while (progbar.GetAbortState() !== '') {
											setPauseStatus(true);
											if (sleepdur) DOpus.Delay(sleepdur);
											if (progbar.GetAbortState() === 'a') { userAborted = true; break unfinished; }
										}
										setPauseStatus(false);
										break;
								}
							}
						}
					}
				}
			}
		}
		logger.force(sprintf('%s -- totalbytes: %d, selected_bytes_cnt: %d', fnName, totalbytes, selected_bytes_cnt));
		logger.force(sprintf('%s -- all_finished: %b', fnName, all_finished));
	}


	// LAST CLEANUP ACTIONS
	{
		if (USE_PROGRESS_BAR) {
			progbar.FinishFile();
			progbar.Hide();
		}
		var tsFinish = getTS();
		// following is only for cosmetical reasons
		// wait for DOpus to output the last 'Script Completed' lines
		// otherwise DOpus might show a 'Script Completed' in the middle of our outputs below
		DOpus.Delay(100);
		// DOpus.ClearOutput();
	}


	// PREPARE RESULTS OBJECT
	{
		// results ready, all threads finished/timed out
		// put everything neatly into an object
		var outObj = {
				items: {}
			},
			timeoutsCnt      = 0,
			unfinishedCnt    = 0,
			maxElapsedFile   = 0,
			maxElapsedThread = 0,
			longestFileName  = '',
			longestFileSize  = 0;
		// a threadID points to 1 knapsack
		for (var ki = 0; ki < selectedKS.knapsacks.length; ki++) {
			var ksMap = tp(selectedKS.knapsacks[ki]['threadID']);
			// each knapsack contains a map of files (also maps)
			var elapsedThread = 0;
			for (var eKS = new Enumerator(ksMap); !eKS.atEnd(); eKS.moveNext()) {
				var fileFullpath = eKS.item();          // full path of file
				var fileAttribs  = ksMap(fileFullpath); // file attributes
				// logger.force(sprintf('%s -- file: %s', fnName, fileMap('filename')));
				outObj.items[fileFullpath] = {
					'maxwait'   : fileAttribs('maxwait'),
					'filename'  : fileAttribs('filename'),
					'filepath'  : fileAttribs('filepath'),
					'filesize'  : fileAttribs('filesize'),
					'finished'  : fileAttribs('finished'),
					'elapsed'   : fileAttribs('elapsed'),
					'timeout'   : fileAttribs('timeout'),
					'error'     : fileAttribs('error'),
					'hash'      : fileAttribs('hash'),
					'finalized' : fileAttribs('finalized'),
				}
				if (outObj.items[fileFullpath]['elapsed'] > maxElapsedFile) {
					maxElapsedFile  = outObj.items[fileFullpath]['elapsed'];
					longestFileName = outObj.items[fileFullpath]['filename'];
					longestFileSize = outObj.items[fileFullpath]['filesize'];
				}
				elapsedThread += outObj.items[fileFullpath]['elapsed'];
				if(!userAborted && !outObj.items[fileFullpath]['finished']) {
					logger.force('unfinished file: ' + fileFullpath);
					++unfinishedCnt;
				}
				if(outObj.items[fileFullpath].timeout) ++timeoutsCnt;
			}
			if (elapsedThread > maxElapsedThread) {
				maxElapsedThread = elapsedThread;
			}
		}
		outObj.summary = {
			'myname'           : fnName,
			'tsstart'          : tsStart,
			'tsfinish'         : tsFinish,
			'aborted'          : userAborted,
			'totalelapsed'     : tsFinish - tsStart,
			'maxelapsedfile'   : maxElapsedFile,
			'maxelapsedthread' : maxElapsedThread,
			'longestfilename'  : longestFileName,
			'longestfilesize'  : longestFileSize,
			'timeouts'         : timeoutsCnt,
			'unfinished'       : unfinishedCnt,
			'totalfiles'       : selected_items_cnt || 0,
			'totalsize'        : selected_bytes_cnt || 0,
			'avgspeed'         : selected_bytes_cnt * 1000 / (tsFinish - tsStart) || 0 // we calculate speed per second
		};
	}
	for(f in outObj.items) {
		var el = outObj.items[f];
		var itemSummaryMsg = sprintf(
			'%s -- Worker finished: %s, timeout: %s, size: %10d, elapsed: %7d ms, file: %s, result: %s',
			fnName,
			el.finished,
			el.timeout,
			el.filesize,
			el.elapsed,
			el.filepath,
			el.hash
		)

		var oItem = DOpus.FSUtil.GetItem(el.filepath);
		var _tmp = { last_modify: new Date(oItem.modify).getTime(), last_size: parseInt(oItem.size), hash: el.hash };
		logger.force(sprintf('%s -- out: %s, %s', fnName, JSON.stringify(_tmp)));
		SaveADS(oItem, _tmp);
	}

	// FROM THIS POINT ON, DO WHAT YOU WANT...
	{
		// SHOW RESULTS
		var showResults = true, showDetailedResults = false, showDialog = true;
		if (showResults) {
			if (showDetailedResults) {
				for(f in outObj.items) {
					var el = outObj.items[f];
					var itemSummaryMsg = sprintf(
						'%s -- Worker finished: %s, timeout: %s, size: %10d, elapsed: %7d ms, file: %s, result: %s',
						fnName,
						el.finished,
						el.timeout,
						el.filesize,
						el.elapsed,
						el.filepath,
						el.hash
					)
					logger.warn(itemSummaryMsg);
				}
				logger.warn(' ');
				logger.warn(' ');
				logger.warn(' ');
				logger.warn(' ');
				logger.warn(' ');
			}
			var overallSummaryMsg = sprintf(
				'\n== %s SUMMARY ==\nStart: %s\nFinish: %s\n'
				+ '%s' // show aborted only if necessary
				+ 'Timeouts: %d\nUnfinished: %d\n'
				+ 'Max Elapsed/Thread: %d ms (%s s)\nMax Elapsed/File: %d ms (%s s)\n'
				+ 'Max Elapsed for File Name: %s\nMax Elapsed for File Size: %d (%s)\n'
				+ '\n\nTotal Files: %d\n\nTotal Size: %s bytes (%s)\n\nTotal Elapsed: %d ms (%s s)\n\nAverage Speed: %s/s',
				outObj.summary.myname,
				outObj.summary.tsstart.formatAsHms(),
				outObj.summary.tsfinish.formatAsHms(),
				outObj.summary.aborted ? 'Aborted: Yes\n' : '',
				outObj.summary.timeouts,
				outObj.summary.unfinished,
				outObj.summary.maxelapsedthread,
				outObj.summary.maxelapsedthread.formatAsDuration(),
				outObj.summary.maxelapsedfile,
				outObj.summary.maxelapsedfile.formatAsDuration(),
				outObj.summary.longestfilename,
				outObj.summary.longestfilesize,
				outObj.summary.longestfilesize.formatAsSize(),
				outObj.summary.totalfiles,
				outObj.summary.totalsize,
				outObj.summary.totalsize.formatAsSize(),
				outObj.summary.totalelapsed,
				outObj.summary.totalelapsed.formatAsDuration(),
				outObj.summary.avgspeed.formatAsSize()
			);
			// var overallSummaryMsg = JSON.stringify(outObj.summary, null, 4);
			logger.force(overallSummaryMsg);
		}
		if(showResults && showDialog) {
			// show an overall summary message as dialog if you like
			var dlgConfirm = scriptCmdData.func.Dlg;
			dlgConfirm.message  = overallSummaryMsg.replace(/, /mg, '\n');
			dlgConfirm.title	= Global.SCRIPT_NAME + ' - Results' ;
			dlgConfirm.buttons	= 'OK';
			ret = dlgConfirm.show;
		}
	}
}

// called by onDOpusMTHManagerStart - do not call directly
function onDOpusMTHWorker(scriptCmdData) {
	var fnName = 'OnMTHWorker'; // only for logger outputs, nothing else

	var param = {};
	param.threadID = scriptCmdData.func.args.THREADID;
	param.maxwait  = scriptCmdData.func.args.MAXWAIT;
	logger.info(sprintf('\t%s -- threadID %s, started, maxwait: %d', fnName, param.threadID, param.maxwait));

	// check the thread pool
	var tp = util.sv.Get('TP');
	if(!tp(param.threadID)) {
		throw new Error('TODO - ADJUST');
	}

	var aborted = false;

	var ksMap = tp(param.threadID);
	// logger.force(sprintf('%s -- ksMap("path"): %s', fnName, ksMap('path')));
	filesloop: for (var cnt = 0, e = new Enumerator(ksMap); !e.atEnd(); ++cnt, e.moveNext()) {
		var ksItemKey = e.item();         // full path is the key, as we put it in the manager
		var ksItemVal = ksMap(ksItemKey); // map with: maxwait, filename, filepath, filesize, finished, elapsed, timeout, error, hash
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
		var ts1 = getTS();
		var hashObj = calculateHash(ksItemVal('filepath'), null);
		var ts2 = getTS();

		// put the results back to TP
		ksItemVal('finished') = true;
		ksItemVal('elapsed')  = ts2 - ts1;
		if (hashObj.error !== false) {
			// some error occurred
			ksItemVal('error') = hashObj.error;
			ksItemVal('hash')  = false;
		} else {
			ksItemVal('error') = false;
			ksItemVal('hash')  = hashObj.hash;
		}
		tp(param.threadID)(ksItemKey) = ksItemVal;
	}
	logger.info(sprintf('%s -- threadID %s, finished, items: %s, aborted: %b', fnName, param.threadID, cnt, aborted));
}

function onDOpusHasHashStream(scriptColData){
	var item = scriptColData.item;
	if (item.is_dir || item.is_reparse || item.is_junction || item.is_symlink) return;
	var res = HasHashStream(item);
	scriptColData.value = res ? 'Yes' : 'No';
	scriptColData.group = 'Has Metadata: ' + scriptColData.value;
	return res;
}

function onDOpus_MultiColRead(scriptColData) {
	var fnName = 'onDOpus_MultiColRead';

	var ts1 = new Date().getTime();

	var item = scriptColData.item;
	if (item.is_dir || item.is_reparse || item.is_junction || item.is_symlink ) return;
	logger.info('...Processing ' + item.name);

	// get ADS object
	var item_props = ReadADS(item);
	if (item_props === false || typeof item_props === 'undefined' || !isObject(item_props)) {
		logger.normal(item.name + ': Metadata does not exist or INVALID');
		return;
	}

	// iterate over requested columns
	for (var e = new Enumerator(scriptColData.columns); !e.atEnd(); e.moveNext()) {
		var key = e.item();

		var outstr = '';

        switch(key) {
			case GetStandardizedColumnName('NeedsUpdate'):
				var differentModifDate = new Date(item.modify).valueOf() !== item_props.last_modify,
					differentSize      = parseInt(item.size)             !== item_props.last_size;
				outstr = differentModifDate || differentSize ? 1 : 0;
				scriptColData.columns(key).group = 'Needs update: ' + (outstr ? 'Yes' : 'No');
				scriptColData.columns(key).value = outstr;
				break;

			case GetStandardizedColumnName('NeedsUpdateVerbose'):
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

			case GetStandardizedColumnName('ADSDataRaw'):
				scriptColData.columns(key).value = JSON.stringify(item_props);
				break;

			case GetStandardizedColumnName('ADSDataFormatted'):
				scriptColData.columns(key).value = JSON.stringify(item_props, null, "\t");
				break;
		} // switch
	} // for enum
	var ts2 = new Date().getTime();
	logger.verbose('OnMExt_MultiColRead() -- Elapsed: ' + (ts2 - ts1) + ', current: ' + ts2);
}



// INTERNAL COMMANDS
function KnapsackSelectedItems(enumerableItems, fnItemFilter, recurse, numThreads, oneForEachFile) {
	var fnName = 'KnapsackSelectedItems';

	logger.force(sprintf('%s -- Recurse: %b, Num Threads: %d, One For Each File: %b', fnName, recurse, numThreads, oneForEachFile));

	// WARNING!
	// fnItemFilter runs after all files are selected, not during the determination of files
	fnItemFilter   = typeof fnItemFilter   === 'function'  ? fnItemFilter : fnAcceptFilesIndiscriminately;
	recurse        = typeof recurse        === 'undefined' ? true         : !!recurse;
	numThreads     = typeof numThreads     === 'number'    ? numThreads   : MAX_AVAILABLE_CORE_COUNT;
	oneForEachFile = typeof oneForEachFile === 'undefined' ? false        : !!oneForEachFile;

	// output POJO
	var outObj = {
		knapsacks: [],
		filescnt : 0,
		totalsize: 0,
		items    : []
	};
	// we will use this object to sort files by
	// values: { 'size': size, 'path': full path }
	// var outObj['items'] = [];
	// to convert DOpus path and size to JS-compatible types
	var tempPath, tempName, tempSize;
	// max # of files directly in a subdir, acts also against infinite while-loop if enum.complete goes wrong
	var icnt, imax = 100000;
	// unfiltered list of DOpus Items
	var aItemsArray = [], iItemsSize = 0;


	// PRESELECT ALL FILES
	{
		// first collect all the path & size information for the selected items
		// note we pass an 'enumerableItems' which is most likely passed from scriptCmdData.func.sourcetab.selected
		var tsSelectStart = getTS();
		logger.normal(sprintf('%s -- Getting list of items - Started', fnName));
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
					aItemsArray.push(subitem);
					iItemsSize += parseInt(subitem.size);

					// TODO - CLEANUP
					// tempPath = ''+subitem.realpath;
					// tempName = ''+subitem.name;
					// tempSize = parseInt(subitem.size);
					// outObj['items'].push({ 'path': tempPath, 'name': tempName, 'size': tempSize });
					// outObj['totalsize'] += tempSize;
					// ++outObj['filescnt'];
				}
				fEnum.Close();
			} else {
				// type: file
				aItemsArray.push(selitem);
				iItemsSize += parseInt(selitem.size);

				// TODO - CLEANUP
				// tempPath = ''+selitem.realpath;
				// tempName = ''+selitem.name;
				// tempSize = parseInt(selitem.size);
				// outObj['items'].push({ 'path': tempPath, 'name': tempName, 'size': tempSize });
				// outObj['totalsize'] += tempSize;
				// ++outObj['filescnt'];

			}
		}
		var tsSelectFinish = getTS();
		logger.normal(sprintf('%s -- Getting list of items - Finished in %d ms, found: %d files, %d bytes', fnName, tsSelectFinish-tsSelectStart, aItemsArray.length, iItemsSize));
	}


	// COLLECT FILES USING GIVEN FILTER
	{
		// first collect all the path & size information for the selected items
		// note we pass an 'enumerableItems' which is most likely passed from scriptCmdData.func.sourcetab.selected
		var tsFilterStart = getTS();
		logger.normal(sprintf('%s -- Filtering of items - Started', fnName));
		// for (var e = new Enumerator(enumerableItems); !e.atEnd(); e.moveNext()) {
		// 	var selitem = e.item();
		for (var i = 0; i < aItemsArray.length; i++) {
			var selitem = aItemsArray[i];
			// filter out items with the given function
			if (!fnItemFilter(selitem)) {
				logger.normal(sprintf('%s -- Filtering out %s', fnName, selitem.name));
				continue;
			}
			tempPath = ''+selitem.realpath;
			tempName = ''+selitem.name;
			tempSize = parseInt(selitem.size);
			outObj['items'].push({ 'path': tempPath, 'name': tempName, 'size': tempSize });
			outObj['totalsize'] += tempSize;
			++outObj['filescnt'];
		}
		var tsFilterFinish = getTS();
		logger.normal(sprintf('%s -- Filtering of items - Finished in %d ms, found: %d files, %d bytes', fnName, tsFilterFinish-tsFilterStart, outObj['filescnt'], outObj['totalsize']));
	}


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
		var knapsackCount = oneForEachFile ? outObj['filescnt'] : Math.min(outObj['filescnt'], numThreads);

		// we will not use a knapsack algorithm in the classical sense per se
		// since we do not have 2+ competing factors, but only 1: size, size, size! (that's still 1)
		// thus we will implement a cheapass knapsack algorithm but a very fast one to compute

		// calculate the ideal knapsack size
		var knapsackSize = Math.ceil(outObj['totalsize'] / knapsackCount);       // e.g. 24 MB over 24 threads = 1 MB... ideally!

		// at the very max each knapsack will have this many elements
		var knapsackMaxElements = Math.ceil(outObj['filescnt'] / knapsackCount); // e.g. 246 files over 24 threads = max 11 items per knapsack

		logger.force(sprintf('%s -- Knapsack Count: %d, Ideal Knapsack Size: %d, Ideal Max Elements/Knapsack: %d', fnName, knapsackCount, knapsackSize, knapsackMaxElements));

		// initialize individual knapsacks
		outObj['knapsacks'] = [];
		for (var i = 0; i < knapsackCount; i++) {
			outObj['knapsacks'].push({ 'capacity': 0, 'items': [] });
		}

		if (PROCESS_BIGGEST_FILES_FIRST) {
			// sort the files by descending size - note that the array is sorted in place, and no copy is made
			outObj['items'].sort(function(a, b){
				return b.size - a.size; // sort descending
			});
		}
		// TODO - DELETE
		{
			// take the biggest file, put it into first free knapsack *
			// proceed with the next biggest file, put it into another knapsack
			// once we have same amount of files on this level,
			// increment level by 1 and proceed with next big file
			// until we run out of files
			//
			// *: first free knapsack means, if we put this file into it, its capacity shouldn't be exceeded
			// however, if the file size is larger than the ideal average capacity,
			// we will put into one with the least amount of items
			// if another very large file is encountered, it will be put another empty one if available, or one with least items
			//
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
			for (var ks = 0; ks < knapsackCount; ks++) {
				if (outObj['knapsacks'][ks]['capacity'] + outObj['items'][i]['size'] <= knapsackSize) {
					outObj['knapsacks'][ks]['items'].push(outObj['items'][i]);
					outObj['knapsacks'][ks]['capacity'] += outObj['items'][i]['size'];
					// logger.force(sprintf('%s -- Found a home for file: %s, size: %d', fnName, allObjBySize[i]['path'], allObjBySize[i]['size']));
					continue knapsackAllocLoop; // we found a home continue with next file
				}
			}

			// if a file size is larger than ideal capacity, we put it into any knapsack with least items
			var minimumItemsFound = knapsackMaxElements;
			var minimumFilledKnapsackNumber = -1;
			for (var ks = 0; ks < knapsackCount; ks++) {
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


	// SANITY CHECK - NO FILE GETS LEFT BEHIND!
	{
		var totalKSItemsCount = 0, totalKSItemsSize = 0;
		for (var ks = 0; ks < knapsackCount; ks++) {
			totalKSItemsCount += outObj['knapsacks'][ks]['items'].length;
			totalKSItemsSize  += outObj['knapsacks'][ks]['capacity'];
			logger.info(sprintf('%s -- Knapsack #%d, capacity: %d, length: %d', fnName, ks, outObj['knapsacks'][ks]['capacity'], outObj['knapsacks'][ks]['items'].length));
		}
		if (totalKSItemsCount !== outObj['filescnt'] || totalKSItemsSize !== outObj['totalsize']) {
			var msg = sprintf('%s -- Some items could not be placed in knapsacks - Total: %d, Placed: %d, Total Size: %d, Placed Size: %d', fnName, outObj['filescnt'], totalKSItemsCount, outObj['totalsize'], totalKSItemsSize);
			logger.force(msg);
			throw new Error(msg);
		}
	}


	// if you select, 1000+ files, a gigantic array might be too much for JSON.stringify!
	// logger.error(JSON.stringify(outObj['knapsacks'], null, 4));
	for (var ks = 0; ks < knapsackCount; ks++) {
		// logger.force('Knapsack #' + ks + '\n\n' + JSON.stringify(outObj['knapsacks'][ks], null, 4));
	}

	/*
		output structure
		{
			filescnt: number of files,
			totalsize: number of bytes,
			knapsacks: [
				{
					capacity: number of bytes,
					items: [ { 'path': string, 'name': string, 'size': number }, ... ]
				}, ...
			],
			items: array of [ { 'path': string, 'name': string, 'size': number }, ... ]
		}
	*/
	logger.force(sprintf('%s -- outObj.filescnt: %d, outObj.totalsize: %d', fnName, outObj.filescnt, outObj.totalsize));
	return outObj;
}

function fnAcceptFilesIndiscriminately(oItem) {
	return true;
}
function fnRejectFilesIndiscriminately(oItem) {
	return false;
}
function fnSelectFilesWithoutHashes(oItem) {
	var fnName = 'fnSelectFilesWithoutHashes';
	var res = false;
	if (oItem.is_dir || oItem.is_reparse || oItem.is_junction || oItem.is_symlink) {
		// nothing - this should never happen in the first place, cause we select only files in KnapsackSelectedItems() anyway
    } else {
		res = DOpus.FSUtil.Exists(oItem.realpath + ':' + getHashStreamName());
		logger.verbose(sprintf('%s -- Checked %s - exists: %b', fnName, oItem.realpath + ':' + getHashStreamName(), res));
		res = !res;
	}
	return res;
}


function calculateHash(file, algo) {
	var fnName = 'calculateHash'; // only for logger outputs, nothing else
	if (typeof file === 'undefined') return logger.error(sprintf('%s -- No file name received: ', fnName, file));

	algo = algo || 'sha1';

	var outObj = { error: false, hash: false};

	item = DOpus.FSUtil.GetItem(file);
	logger.info(sprintf('\t\t%s -- Calculating %s hash, started @%s, file: %s', fnName, algo, getTS(), file));
	try {
		if (item.is_dir) return;
		outObj.hash = DOpus.FSUtil().Hash(item, algo);
	} catch (e) {
		logger.force(sprintf('\t\t%s -- Error: %s, File: %s', fnName, e.toString(), file));
		outObj.error = e;
	}
	logger.info(sprintf('\t\t%s -- Calculating %s hash, finished @%s, file: %s, result: %s', fnName, algo, getTS(), file, outObj.hash));

	return outObj;
}

function getHashStreamName(algorithm) {
	if (typeof algorithm === 'undefined') algorithm = DEFAULT_ALGORITHM;
	return STREAM_PREFIX + algorithm.toUpperCase();
}


// TODO - REVIEW
function translateCommandNameToFnName(cmdName) {
	return 'onDOpus' + cmdName;
}
function getTS() {
	return new Date().getTime();
}
function getThreadID() {
	return 't_' + getTS() + '_' + Math.floor(100 + Math.random() * 899);
}
function getResVar(tid) {
	return 'v_' + tid;
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
	return new Date(this).toTimeString().substr(0,8);
}
// LOGGER object
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
// internal method called by OnInit()
function addToConfigVar(initData, group, name, desc, value) {
	cfg							= config.getBinding(name);;
	initData.Config[cfg]		= value || config.get(name);
	initData.config_desc(cfg)	= desc;
	initData.config_groups(cfg)	= group;
}
// internal method called by OnInit()
function addCommand(initData, name, template, icon, label, desc) {
	var cmd         = initData.AddCommand();
	cmd.name        = Global.SCRIPT_NAME_SHORT + name;
	cmd.method      = translateCommandNameToFnName(cmd.name); // TODO - DELETE - translateCommandNameToFnName(name); // 'On' + Global.SCRIPT_NAME_SHORT + name;
	cmd.template    = template || '';
	cmd.icon		= icon && GetIcon(initData.file, icon) || '';
	cmd.label		= label || '';
	cmd.desc        = desc || label;
}
function GetStandardizedColumnLabel(name) {
	return Global.SCRIPT_NAME_SHORT + ' ' + name;
}
function GetStandardizedColumnName(name) {
	return Global.SCRIPT_NAME_SHORT + '_' + name;
}
// internal method called by OnInit()
function addColumn(initData, method, name, label, justify, autogroup, autorefresh, multicol) {
	var col         = initData.AddColumn();
	col.method      = method;
	col.name        = GetStandardizedColumnName(name);
	col.label       = GetStandardizedColumnLabel(label || name);
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
	// function addCommand(initData, name, method, template, icon, label, desc)
	addCommand(initData,
		'ManagerStart',
		// 'MAXCOUNT/N,MAXWAIT/N,RECURSE/S,COMMAND/K',
		'MAXCOUNT/N,MAXWAIT/N,RECURSE/S,' +
		'HARD_UPDATE_ADS/S,VERIFY_FROM_ADS/S,SMART_UPDATE_ADS/S,FIND_DIRTY/S,FIND_MISSING/S,' +
		'COPY_TO_CLIPBOARD/S,EXPORT_TO_FILE/S,IMPORT_FROM_FILE/S,VERIFY_FROM_FILE/S'
		,
		'Add',
		'MTH Manager',
		'Start hashing of selected files'
		);
	addCommand(initData,
		'Worker',
		'THREADID/K,MAXWAIT/N,CMD/K,FILE/K',
		'Warning',
		'MTH Worker (do not call directly!)'
		);
	// addCommand(initData,
	// 	'CalculateHash',
	// 	'RESVAR/K,FILE/K,ALGORITHM/K',
	// 	'Warning',
	// 	'Calculate hash with given algorithm');
}
// internal method called by OnInit()
function _initializeColumns(initData) {
	// function addColumn(initData, method, name, label, justify, autogroup, autorefresh, multicol)

	// this column is kept separate, no multicol
	addColumn(initData,
		'onDOpusHasHashStream',
		'HasHashStream',
		'Available',
		'right', false, true, false);

	// all multicol below
	addColumn(initData,
		'onDOpus_MultiColRead',
		'NeedsUpdate',
		'Dirty',
		'left', false, true, true);

	addColumn(initData,
		'onDOpus_MultiColRead',
		'NeedsUpdateVerbose',
		'Dirty (Verbose)',
		'left', false, true, true);

	addColumn(initData,
		'onDOpus_MultiColRead',
		'ADSDataFormatted',
		'ADSData (Formatted)',
		'left', true, true, true);

	addColumn(initData,
		'onDOpus_MultiColRead',
		'ADSDataRaw',
		'ADSData (Raw)',
		'left', true, true, true);
}

// Date formatter for "SetAttr META lastmodifieddate..."
function DateToDOpusFormat(oJSDate) {
	return DOpus.Create.Date(oJSDate).Format("D#yyyy-MM-dd T#HH:mm:ss");
}
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

// TODO - REVIEW
// helper method to get the Icon Name for development and OSP version
function GetIcon(scriptPath, iconName) {
	var oPath = DOpus.FSUtil.Resolve(scriptPath);
	var isOSP = oPath.ext === 'osp';
	var isOSP = true;
	//logger.normal('Requested icon: ' + iconName + ', is OSP: ' + isOSP + '  --  ' + scriptPath);
	return isOSP
			? '#MTHasher:' + iconName
			: oPath.pathpart + "\\icons\\ME_32_" + iconName + ".png";
}
// internal method
// from https://attacomsian.com/blog/javascript-check-variable-is-object
function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
};


// internal method
// reads requested file (incl. ADS streams)
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
// internal method
// reads requested file (incl. ADS streams)
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
// checks if given path is valid
function IsValidPath(path) {
	return DOpus.FSUtil.Exists(path);
}

function GetStreamName() {
	return STREAM_PREFIX + CURRENT_ALGORITHM;
}


// checks if given item has a hash stream
function HasHashStream(oItem) {
	if (oItem.is_dir || oItem.is_reparse || oItem.is_junction || oItem.is_symlink) return;
	logger.verbose("...Processing " + oItem.name);
	return  IsValidPath(oItem.realpath + ':' + GetStreamName());
}

// internal method
// reads ADS data, calls ReadFile()
function ReadADS(oItem) {
	var fnName = 'ReadMetadataADS';
	var msn = GetStreamName();
	if (!msn) { logger.error('ReadMetadataADS -- Cannot continue without a stream name: ' + msn); return false; }
	if (!oItem.modify) { logger.error('ReadMetadataADS -- Expected FSUtil Item, got: ' + oItem + ', type: ' + typeof oItem); return false; }
	var rp = ''+oItem.realpath; // realpath returns a DOpus Path object and it does not work well with Map as an object, we need a simple string

	// InitCacheIfNecessary();

	// check if cache is enabled and item is in cache
	var res;

	// if (config.get('cache_enabled') && util.sv.Get('cache').exists(rp)) {
	// 	logger.verbose(oItem.name + ' found in cache');
	// 	res = util.sv.Get('cache')(rp);
	// } else {
		logger.verbose(oItem.name + ' reading from disk');
		res = ReadFile(rp + ':' + msn, TEXT_ENCODING.utf8); // always string or false ion error
		if (res === false) { return res; }
		// if (typeof res === 'string' && config.get('cache_enabled') && !util.sv.Get('cache').exists(rp)) {
		// 	logger.verbose(oItem.name + ' was missing in cache, adding');
		// 	res = JSON.parse(res); res.added_to_cache = new Date().getTime().toString(); res = JSON.stringify(res); // this might be overkill
		// 	util.sv.Get('cache')(rp) = res;
		// }
	// }
	// convert to JS object, do not return {} or anything which passes as object but empty string
	return typeof res === 'string' ? JSON.parse(res) : '';
}

// internal method
// saves ADS data, calls SaveFile()
function SaveADS(oItem, oJSObject) {
	var fnName = 'SaveMetadataADS';
	var msn = GetStreamName();
	if (!msn) { logger.error('SaveMetadataADS -- Cannot continue without a stream name: ' + msn); return false; }
	if (!oItem.modify) { logger.error('SaveMetadataADS -- Expected FSUtil Item, got: ' + oItem + ', type: ' + typeof oItem); return false; }
	var rp = ''+oItem.realpath; // realpath returns a DOpus Path object, even if its 'default' is map(oItem.realpath) does not work well as key, we need a simple string

	// InitCacheIfNecessary();

	var orig_modify = DateToDOpusFormat(oItem.modify);

	util.cmd.ClearFiles();
	util.cmd.AddFile(oItem);
	var res = SaveFile(rp + ':' + msn, JSON.stringify(oJSObject), TEXT_ENCODING.utf8);
	logger.force(sprintf('%s -- Saving %s to %s', fnName, JSON.stringify(oJSObject), rp+':'+msn));

	// if (config.get('keep_orig_modts')) {
		logger.verbose(rp + ', resetting timestamp to: ' + orig_modify);
		util.cmd.RunCommand('SetAttr META "lastmodifieddate:' + orig_modify + '"');
	// }
	// // check if cache is enabled, add/update unconditionally
	// if (config.get('cache_enabled')) {
	// 	oJSObject.added_to_cache = new Date().getTime().toString();
	// 	logger.verbose(oItem.name + ', added to cache: ' + oJSObject.added_to_cache);
	// 	util.sv.Get('cache')(rp) = JSON.stringify(oJSObject);
	// 	logger.normal('SaveMetadataADS - Cache count: ' + util.sv.Get('cache').count);
	// }
	return res;
}

// internal method
// deletes ADS data, directly deletes "file:stream"
function DeleteADS(oItem) {
	var fnName = 'DeleteMetadataADS';
	var msn = GetStreamName();
	if (!msn) { logger.error('DeleteMetadataADS -- Cannot continue without a stream name: ' + msn); return false; }
	if (!oItem.modify) { logger.error('DeleteMetadataADS -- Expected FSUtil Item, got: ' + oItem + ', type: ' + typeof oItem); return false; }
	// var rp = ''+oItem.realpath; // realpath returns a DOpus Path object, even if its 'default' is map(oItem.realpath) does not work well as key, we need a simple string

	// InitCacheIfNecessary();

	var file_stream = oItem.realpath + ':' + msn;
	var orig_modify = DateToDOpusFormat(oItem.modify);

	util.cmd.ClearFiles();
	util.cmd.AddFile(oItem);
	util.cmd.RunCommand('Delete /quiet /norecycle "' + file_stream + '"');
	// if (config.get('keep_orig_modts')) {
		logger.verbose(oItem.realpath + ', resetting timestamp to: ' + orig_modify);
		util.cmd.RunCommand('SetAttr META "lastmodifieddate:' + orig_modify + '"');
	// }
	// if (config.get('cache_enabled')) {
	// 	util.sv.Get('cache').erase(rp);
	// }
}
