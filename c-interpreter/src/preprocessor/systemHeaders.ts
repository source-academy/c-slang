import { getTypeName, sizeType } from "../typing/types";

// Add declarations together with their native implementations.
export const SYSTEM_HEADERS: Readonly<Record<string, string>> = {
  "string.h": `
#ifndef __C_INTERPRETER_STRING_H
#define __C_INTERPRETER_STRING_H
typedef ${getTypeName(sizeType())} size_t;
#ifndef NULL
#define NULL ((void *)0)
#endif
size_t strlen(const char *s);
int strcmp(const char *left, const char *right);
#endif
`,
};
