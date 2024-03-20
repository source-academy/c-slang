/**
 * This file contains various utility functions to help in checking the fulfillment of constraints of different language features.
 */

import { ProcessingError } from "~src/errors";
import { DataType } from "~src/parser/c-ast/dataTypes";
import { isFieldInStruct } from "~src/processor/dataTypeUtil";
