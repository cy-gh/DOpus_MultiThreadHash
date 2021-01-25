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

interface Object {
    /**
     * WARNING: be careful after activating this!
     * for (var k in myObject) for ANY object will include this function by default
     * if this function needs to be skipped, use if (!myObject.hasOwnProperty(k)) continue;
     */
    keys(): Array<string>;
}
