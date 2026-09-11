struct node {
    int value;
    struct node * next;
};

typedef struct node node;

int main() {
    node *head;
    node *one = 0;
    node *two = 0;
    node *three = 0;

    one = malloc(sizeof(node));
    two = malloc(sizeof(node));
    three = malloc(sizeof(node));

    one->value = 1;
    two->value = 2;
    three->value = 3;

    one->next = two;
    two->next = three;
    three->next = 0;

    head = one;
    head = head->next;
    head = head->next;
    free(head);
}