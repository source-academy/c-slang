#include <source_stdlib>

/**
 * @file multi_line_comments_1.c
 * @author your name (you@domain.com)
 * @brief 
 * @version 0.1
 * @date 2023-10-12
 * 
 * @copyright Copyright (c) 2023
 * 
 */

void f(/*adawd*/int x) {
  int /**/ y;
}

int /*

awdawdwad*/
main() {
/*wdwd   
awdawd*/
int x = 1;
f/*/*/(x);
print_int(x);
}