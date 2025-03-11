<?php
header('Content-Type: application/json');

// save_data.php

// Read JSON POST data
$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    $results = $data["results"];
    $filename = "results/results_" . date("YmdHis") . ".csv";
    $fp = fopen($filename, "w");
    fputcsv($fp, ["Trial", "Video", "Response", "Rating"]);
    foreach ($results as $row) {
        fputcsv($fp, [$row["trial"], $row["video"], $row["response"], $row["rating"]]);
    }
    fclose($fp);
    echo json_encode(["status" => "success", "filename" => $filename]);
} else {
    echo json_encode(["status" => "error", "message" => "No data received"]);
}
?>
