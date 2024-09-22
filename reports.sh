#!/bin/bash
echo "Choose an option:"
echo "1. Run tests"
echo "2. Run Sonar Scanner"
read option

case $option in
1)  # Correctly specify option 1
    echo "--> Executing AVA test files"
    npm run test
    echo "--> Generating HTML report - coverage/index.html"
    npm run test:report
    ;;
2)
    echo "--> Replace PATH with your local scanner file path if you haven't already..."
    echo "--> Replace your locally generated token if you haven't already..."
    echo "--> Executing Sonar Scanner: Check http://localhost:9000 for results...."
    export PATH=/home/gowtham/apps/sonar-scanner-cli-5.0.1.3006-linux/sonar-scanner-5.0.1.3006-linux/bin:$PATH
    echo "======================= SCANNING =========================="
    sonar-scanner \
        -Dsonar.projectKey=user-service \
        -Dsonar.sources=. \
        -Dsonar.host.url=http://localhost:9000 \
        -Dsonar.token=sqp_d0f443ecdd6e95ebc3048c3f0c047a9b58ae28b8
    ;;
*)
    echo "Invalid option. Please choose 1 or 2."
    ;;
esac  # End of case statement
