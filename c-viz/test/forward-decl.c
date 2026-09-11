struct node q;

struct node {
    int val;
    struct node * next;
} t;

typedef struct node node;
node arr[5];

struct t1 w;
struct t2 w2;

struct b {
    struct {
        struct t1 {
            short s;
            struct t2 {int i;} * p;
        } z;
    } z;
};

struct a1 {
    struct a2 *friend;
};

struct a2 {
    struct a1 *friend;
};

struct b1 {
    struct {
        struct b2 * p;
    } z;
};

struct b2 {
    struct b3 x;
};

struct b3 {
    long long l;
    node a[3];
};

// struct bad { struct bad oops; int x; };
// struct bad2 { struct bad2 oops; };
// struct xx { int i; };
// struct xx { int j; };

int main() {
    w.s = 10;
    w2.i = 11;
    node * n = malloc(sizeof(node));
    n->val = 21;

    q.val = 1;
    q.next = &q;
    return q.next->next->next->next->next->val;
}