# wait a little before starting
sleep 10

# keep generating load, until container stops
while true
do
    docker run -v /home/ubuntu/public-viz-loader/screenshots:/app/screenshots public-load >> /home/ubuntu/docker.log
done
