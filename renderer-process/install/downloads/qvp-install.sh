#!/bin/bash

# Iterate through all arguments and print them
for arg in "$@"; do
  echo "$arg"
done
# Define the number of times to loop
count=20  # Change this to the desired count

# Loop for the specified count
for ((i=1; i<=count; i++)); do
  echo "This is message $i of $count printed at regular intervals."
  sleep 1  # Sleep for 5 seconds (adjust as needed)
done

echo "shell script exit."
