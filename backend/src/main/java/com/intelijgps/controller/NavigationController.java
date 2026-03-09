package com.intelijgps.controller;

import com.intelijgps.dto.NavigationInstructionDTO;
import com.intelijgps.dto.NavigationRequest;
import com.intelijgps.service.LandmarkInstructionEngine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/navigate")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Navigation", description = "Landmark-Based Navigation Instruction Engine")
public class NavigationController {

    private final LandmarkInstructionEngine instructionEngine;

    @PostMapping
    @Operation(
        summary = "Generate a landmark-based voice navigation instruction",
        description = "Pass current and next GPS coordinates. Returns a natural Spanish voice instruction " +
                      "anchored to the nearest cultural landmark. Use language=es-GQ for ecuatoguineano modismos."
    )
    public ResponseEntity<NavigationInstructionDTO> getInstruction(
        @RequestBody NavigationRequest request
    ) {
        return ResponseEntity.ok(instructionEngine.generateInstruction(request));
    }
}
