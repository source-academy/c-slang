typedef char T;
int f(double T) { return sizeof(T) == sizeof(double) && T == 2; }
int main(void) { return f(2); }
