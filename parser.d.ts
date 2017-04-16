declare module parser {
    function parse(input: string, options?: Object): any;
    function SyntaxError(message: string, expected: any, found: any, location: any): any;
}

export = parser;