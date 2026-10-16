typedef char T;
int main(void) { enum E { T = 2 }; return sizeof(T) == sizeof(int) && T == 2; }
