typedef char T;
int f(int T), g(T);
int f(int T) { return T; } int g(T x) { return x; }
int main(void) { return f(1) && g(1) && sizeof(T) == 1; }
