package com.zeyvo.auth.infra.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(c -> c.configurationSource(corsSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints — no JWT required
                        .requestMatchers("/v1/health").permitAll()
                        .requestMatchers("/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/auth/telegram-widget").permitAll()
                        // Telegram webhook: secured by X-Telegram-Bot-Api-Secret-Token, not JWT
                        .requestMatchers("/v1/integrations/telegram/webhook").permitAll()
                        // register-webhook: requires SUPER_ADMIN role (enforced via @PreAuthorize)
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/v1/openapi.json", "/v1/docs/**").permitAll()
                        // Public reads (branch list, queue peek)
                        .requestMatchers(HttpMethod.GET, "/v1/branches/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/signage/**").permitAll()
                        // Self-service org onboarding (anonymous; OTP gates actual access)
                        .requestMatchers(HttpMethod.POST, "/v1/onboarding/**").permitAll()
                        // Public analytics — page view tracking, no PII beyond IP
                        .requestMatchers(HttpMethod.POST, "/v1/public/pageview").permitAll()
                        // Anonymous ticket join — no login required (QR/kiosk flow)
                        .requestMatchers(HttpMethod.POST, "/v1/tickets").permitAll()
                        // Device webhook secured by API token at adapter layer, not JWT
                        .requestMatchers(new AntPathRequestMatcher("/v1/devices/*/webhook")).permitAll()
                        // SockJS handshake (/ws/info, /ws/xhr_streaming, /ws/websocket etc.)
                        // — the JWT is checked at STOMP CONNECT by StompAuthInterceptor.
                        .requestMatchers("/ws/**").permitAll()
                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "https://zeyvo.app",
                "https://www.zeyvo.app"
        ));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
