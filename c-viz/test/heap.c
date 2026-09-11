int * p = (int *) malloc(sizeof(int) * 10);
int * q = (int *) malloc(5);
char * c;

int main() {
    c = (char *) p;
    c = c + 20;
    *c = 'a';

    p[1] = 10;

    *q = 5;

	free(p);
}
