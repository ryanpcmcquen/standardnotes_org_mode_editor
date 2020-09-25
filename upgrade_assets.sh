for ASSET in $(grep -Eio 'src="(https://[^"]*)"' emacs/index.html | cut -d '"' -f 2); do
    wget -N $ASSET -P assets/
done
