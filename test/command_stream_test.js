/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* global describe, it */

const assert = require('assert');
const fs = require('fs');

const ThrowingErrorListener = require('../src/parser/htl/ThrowingErrorListener');

const TemplateParser = require('../src/parser/html/TemplateParser');
const DebugCommandVisitor = require('../src/parser/commands/DebugCommandVisitor');
const InterpretingCommandVisitor = require('../src/interpreter/InterpretingCommandVisitor');
const Runtime = require('../src/interpreter/Runtime');


function process(input) {
    return new TemplateParser()
        .withErrorListener(ThrowingErrorListener.INSTANCE)
        .parse(input);
}

function debugCommands(commands) {
    const cmdvisitor = new DebugCommandVisitor();
    commands.forEach((c) => {
        c.accept(cmdvisitor);
    });

    console.log(cmdvisitor.result);
    return cmdvisitor.result;
}

function evaluateCommands(commands, runtime) {
    const cmdvisitor = new InterpretingCommandVisitor(runtime);
    commands.forEach((c) => {
        c.accept(cmdvisitor);
    });

    console.log(cmdvisitor.result);
    return cmdvisitor.result;
}

function readTests(filename) {
    const text = fs.readFileSync(filename, 'utf-8');
    const lines = text.split(/\r\n|\r|\n/);

    const tests = [];
    let test = null;
    lines.forEach((line) => {
        if (line === '#') {
            return;
        }
        if (line.startsWith('###')) {
            test = {
                name: line.substring(4),
                input: ''
            };
            tests.push(test);
        } else if (line.startsWith('---')) {
            test.commands = ''
        } else if (line.startsWith('===')) {
            test.output = ''
        } else if (test && ('output' in test)) {
            test.output += line;
        } else if (test && ('commands' in test)) {
            test.commands += line + '\n';
        } else if (test && ('input' in test)) {
            test.input += line;
        }
    });
    return tests;
}

describe('Command Stream Tests', function() {

    const tests = readTests('test/command_stream_spec.txt');

    describe('simple tests', function(done) {
        tests.forEach(function(test) {
            if (!test.input) {
                return;
            }
            const commands = process(test.input);

            const runtime = new Runtime();
            runtime.scope.setVariable('world', 'Earth');
            runtime.scope.setVariable('properties', {
                title: 'Hello, world.',
                fruits: ['Apple', 'Banana', 'Orange'],
                comma: ', '
            });

            if (test.commands) {
                it(`Generates commands for '${test.name}' correctly.`, function() {
                    assert.equal(debugCommands(commands), test.commands);
                });
            }

            if (test.output) {
                it(`Generates output for '${test.name}' correctly.`, function() {
                    assert.equal(evaluateCommands(commands, runtime), test.output);
                });
            }
        });
    });
});