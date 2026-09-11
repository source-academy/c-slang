struct test {
    int x;
    struct inner {
        short s;
    } y;
    char arr[5];
};

struct simple {
    int x;
    char c;
};

int main() {
    struct simple s = {1, 'a'};
    struct test * p = malloc(sizeof(struct test));
    struct test tmp = {10, .arr = {1, 2, [4] = 5}, .y = {-1}};
    *p = tmp;
}