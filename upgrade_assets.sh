for ASSET in $(cat assets.txt); do
    wget -N $ASSET -P assets/
done
