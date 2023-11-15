<?php
  $receiving_email_address = 'ricardo.af@live.com.pt';

  if( isset($_POST['submit'])) {

    $contactTo = $receiving_email_address;
    $contactFrom_name = $_POST['name'];
    $contactFrom_email = $_POST['email'];
    $contactSubject = "From personal website: ".$_POST['subject'];
    $contactMessage = $_POST['message'];

    $headers = "From: ".$contactFrom_email;

    mail($contactTo, $contactSubject, $contactMessage, $headers);

  } else {
    die( 'Unable to send the message.');
  } 
?>
