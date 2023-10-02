#!/bin/bash

silent=false

# Iterate through all arguments and print them
for arg in "$@"; do
    # Check if the current argument matches '-s'
    if [ "$arg" = "--silent" ]; then
        echo "Setting silent mode"
        silent=true

    fi
done

PS4='[$(basename "$0"):$LINENO] '
# set -x

# Define the number of times to loop
count=1  # Change this to the desired count

# Loop for the specified count
for ((i=1; i<=count; i++)); do
  echo "This is message $i of $count printed at regular intervals."
  # sleep 0.5  # Sleep for 5 seconds (adjust as needed)
done

if [ $silent == true ]; then
  # host
  echo "qemu-system-x86_64 -nographic"

  # 
  echo "qemu-system-aarch64 -nographic -machine virt"
  echo "qemu-system-aarch64 -nographic -machine virt"
  echo "qemu-system-aarch64 -nographic -machine virt"
  echo "qemu-system-aarch64 -nographic -machine virt"

  #nvme
  echo "nvme_controller test"
  # set +x
fi

echo "shell script exit."

exit 0
