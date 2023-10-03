#include <stdio.h>
#include <unistd.h> // Include for the sleep function

int main(void) {
    printf("nvme_controller\n");
    int cnt = 0;
    while (1) {
        usleep(10000);
        printf("nvme_controller : %d\n", cnt++);
	fflush(stdout);
    }
    return 0; // Added return statement to indicate successful execution
}


