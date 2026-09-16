#include <source_stdlib>
#include <pix_n_flix>
#include <math>

/**
 * Demonstration of applying filter on video played by pixnflix.
 */

void filter_function(char src[300][400][4], char dest[300][400][4], int height, int width) {
    for (int i = 0; i < height; ++i) {
        for (int j = 0; j < width; ++j) {
            dest[i][j][0] = src[i][j][0]; // sin(1.0 * j / width * 3.14) * 255;
            dest[i][j][1] = sin(1.0 * i / height * 3.14) * 255;
            dest[i][j][2] = src[i][j][2];
            dest[i][j][3] = src[i][j][3];
        }
    }
}

int main() {
    use_image_url("https://i.ibb.co/GdSqbT7/Screenshot-2024-04-05-at-1-09-22-AM.jpg");
    //install_filter(&filter_function);
    start();
}