package com.intelijgps.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                // Public endpoints: all API and static resources for now (MVP)
                .requestMatchers(
                    "/api/**", "/ws/**",
                    "/swagger-ui/**", "/api-docs/**",
                    "/", "/index.html", "/static/**",
                    "/*.css", "/*.js", "/*.html", "/*.ico"
                ).permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
