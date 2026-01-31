FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

RUN apt-get update && apt-get install -y \
    tzdata \
    xvfb \
    x11vnc \
    xterm \
    novnc \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*
