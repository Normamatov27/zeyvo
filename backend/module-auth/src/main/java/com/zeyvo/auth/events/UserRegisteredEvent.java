package com.zeyvo.auth.events;

import java.util.UUID;

public record UserRegisteredEvent(UUID userId, String channel) {}
