void a(int x);
void b(int x);

int total = 0;

void a(int x) {
    if (x == 0) return;
    total = total + x;
    b(x);
}

void b(int x) {
    if (x == 0) return;
    total = total + x;
    a(x - 1);
}

int main() {
    a(2);
    return total;
}
