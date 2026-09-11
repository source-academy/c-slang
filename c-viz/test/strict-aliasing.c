int foo (int *p1, short *p2) {
    *p1 = 1;
    *p2 = 2;
    return *p1;
}

int a = 10;

int main() {
    foo(&a, (short *) &a);
}