typedef char T, F(T);
int main(void) { return sizeof(F *) == sizeof(void *); }
