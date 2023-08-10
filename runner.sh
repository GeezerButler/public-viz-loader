# wait a little before starting
sleep 30

# keep generating load, until container stops
while true
do
    docker run -v ./screenshots:/app/screenshots public-load
    echo "docker exit code: "
    echo $?
done
