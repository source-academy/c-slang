#include <source_stdlib>
#include <pix_n_flix>

/**
 * Demonstration of applying filter on video played by pixnflix.
 */

void filter_function(char src[300][400][4], char dest[300][400][4], int width, int height) {
    for (int i = 0; i < width; ++i) {
        for (int j = 0; j < height; ++j) {
            dest[i][j][0] = src[i][j][0];
            dest[i][j][1] = 255;
            dest[i][j][2] = src[i][j][2];
            dest[i][j][3] = src[i][j][3];
        }
    }
}

int main() {
    use_video_url("http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
    install_filter(&filter_function);
    start();
}